import { env } from '../config/env'

export type RoutePosition = { latitude: number; longitude: number }

export type AStarEdge = {
  to: string
  cost: number
}

export type AStarSearchResult = {
  nodes: string[]
  cost: number
}

export class AStarRoutingError extends Error {
  constructor(
    public readonly status: 400 | 404 | 502,
    message: string,
  ) {
    super(message)
    this.name = 'AStarRoutingError'
  }
}

class OsmMapLimitError extends Error {
  constructor() {
    super('The requested OpenStreetMap extract is too dense.')
    this.name = 'OsmMapLimitError'
  }
}

type RoadEdge = AStarEdge & { distanceMeters: number }
type RoadNode = RoutePosition & { id: string; edges: RoadEdge[] }
type RoadGraph = Map<string, RoadNode>
type Bounds = { south: number; west: number; north: number; east: number }
type CachedRoadGraph = { bounds: Bounds; graph: RoadGraph; expiresAt: number }
type OsmTags = Record<string, string | undefined>

const earthRadiusMeters = 6_371_000
const maximumRoadSpeedMetersPerSecond = 130 / 3.6
const endpointSpeedMetersPerSecond = 20 / 3.6
const graphCacheTtlMs = 20 * 60 * 1_000
const graphCacheLimit = 6
const maximumStraightLineRouteMeters = 30_000
const maximumSnapDistanceMeters = 400
const graphCache: CachedRoadGraph[] = []

class MinPriorityQueue<T> {
  private readonly entries: Array<{ value: T; priority: number; cost: number }> = []

  push(value: T, priority: number, cost: number) {
    this.entries.push({ value, priority, cost })
    let index = this.entries.length - 1

    while (index > 0) {
      const parent = Math.floor((index - 1) / 2)
      if (this.entries[parent].priority <= this.entries[index].priority) break
      ;[this.entries[parent], this.entries[index]] = [this.entries[index], this.entries[parent]]
      index = parent
    }
  }

  pop() {
    const first = this.entries[0]
    const last = this.entries.pop()
    if (!first) return undefined

    if (last && this.entries.length > 0) {
      this.entries[0] = last
      let index = 0

      while (true) {
        const left = index * 2 + 1
        const right = left + 1
        let smallest = index

        if (left < this.entries.length && this.entries[left].priority < this.entries[smallest].priority) {
          smallest = left
        }
        if (right < this.entries.length && this.entries[right].priority < this.entries[smallest].priority) {
          smallest = right
        }
        if (smallest === index) break

        ;[this.entries[index], this.entries[smallest]] = [this.entries[smallest], this.entries[index]]
        index = smallest
      }
    }

    return first
  }
}

/**
 * Generic A* implementation. `cost` is the accumulated real travel cost and
 * `heuristic` must not overestimate the remaining cost for optimal routing.
 */
export function searchWithAStar(
  start: string,
  goal: string,
  graph: ReadonlyMap<string, readonly AStarEdge[] | { edges: readonly AStarEdge[] }>,
  heuristic: (nodeId: string) => number,
): AStarSearchResult | null {
  if (start === goal) return { nodes: [start], cost: 0 }

  const open = new MinPriorityQueue<string>()
  const closed = new Set<string>()
  const cameFrom = new Map<string, string>()
  const costs = new Map<string, number>([[start, 0]])
  open.push(start, heuristic(start), 0)

  while (true) {
    const current = open.pop()
    if (!current) return null
    if (current.cost !== costs.get(current.value) || closed.has(current.value)) continue

    if (current.value === goal) {
      const nodes = [goal]
      let node = goal
      while (node !== start) {
        const previous = cameFrom.get(node)
        if (!previous) return null
        nodes.push(previous)
        node = previous
      }
      nodes.reverse()
      return { nodes, cost: current.cost }
    }

    closed.add(current.value)
    const graphEntry = graph.get(current.value)
    const edges = graphEntry && 'edges' in graphEntry ? graphEntry.edges : graphEntry || []
    for (const edge of edges) {
      if (!Number.isFinite(edge.cost) || edge.cost < 0) continue
      const nextCost = current.cost + edge.cost
      const knownCost = costs.get(edge.to)
      if (knownCost !== undefined && nextCost >= knownCost) continue

      cameFrom.set(edge.to, current.value)
      costs.set(edge.to, nextCost)
      // Re-opening is necessary if a caller supplies a consistent-but-not-
      // perfect graph implementation and a cheaper route is found later.
      closed.delete(edge.to)
      open.push(edge.to, nextCost + heuristic(edge.to), nextCost)
    }
  }
}

function distanceMeters(first: RoutePosition, second: RoutePosition) {
  const latitudeDelta = ((second.latitude - first.latitude) * Math.PI) / 180
  const longitudeDelta = ((second.longitude - first.longitude) * Math.PI) / 180
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos((first.latitude * Math.PI) / 180) *
      Math.cos((second.latitude * Math.PI) / 180) *
      Math.sin(longitudeDelta / 2) ** 2

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function validPosition(position: RoutePosition) {
  return (
    Number.isFinite(position.latitude) &&
    Number.isFinite(position.longitude) &&
    position.latitude >= -90 &&
    position.latitude <= 90 &&
    position.longitude >= -180 &&
    position.longitude <= 180
  )
}

function routeBounds(start: RoutePosition, end: RoutePosition): Bounds {
  const straightLineMeters = distanceMeters(start, end)
  if (straightLineMeters > maximumStraightLineRouteMeters) {
    throw new AStarRoutingError(400, 'A* routing supports delivery routes up to 30 km apart.')
  }

  // The padding gives A* enough room to choose a parallel arterial road
  // rather than constraining it to the straight-line corridor.
  const latitudePadding = Math.max(0.003, Math.abs(start.latitude - end.latitude) * 0.2)
  const longitudePadding = Math.max(0.004, Math.abs(start.longitude - end.longitude) * 0.2)
  return {
    south: Math.max(-90, Math.min(start.latitude, end.latitude) - latitudePadding),
    west: Math.max(-180, Math.min(start.longitude, end.longitude) - longitudePadding),
    north: Math.min(90, Math.max(start.latitude, end.latitude) + latitudePadding),
    east: Math.min(180, Math.max(start.longitude, end.longitude) + longitudePadding),
  }
}

function expandBounds(bounds: Bounds, factor: number): Bounds {
  const latitudeCenter = (bounds.south + bounds.north) / 2
  const longitudeCenter = (bounds.west + bounds.east) / 2
  const latitudeHalfSpan = ((bounds.north - bounds.south) / 2) * factor
  const longitudeHalfSpan = ((bounds.east - bounds.west) / 2) * factor
  return {
    south: Math.max(-90, latitudeCenter - latitudeHalfSpan),
    west: Math.max(-180, longitudeCenter - longitudeHalfSpan),
    north: Math.min(90, latitudeCenter + latitudeHalfSpan),
    east: Math.min(180, longitudeCenter + longitudeHalfSpan),
  }
}

function cacheContains(outer: Bounds, inner: Bounds) {
  return (
    outer.south <= inner.south &&
    outer.west <= inner.west &&
    outer.north >= inner.north &&
    outer.east >= inner.east
  )
}

function cachedGraphFor(bounds: Bounds) {
  const now = Date.now()
  for (let index = graphCache.length - 1; index >= 0; index -= 1) {
    if (graphCache[index].expiresAt <= now) graphCache.splice(index, 1)
  }

  const index = graphCache.findIndex((cached) => cacheContains(cached.bounds, bounds))
  if (index < 0) return undefined

  const [cached] = graphCache.splice(index, 1)
  graphCache.unshift(cached)
  return cached.graph
}

function cacheGraph(bounds: Bounds, graph: RoadGraph) {
  graphCache.unshift({ bounds, graph, expiresAt: Date.now() + graphCacheTtlMs })
  if (graphCache.length > graphCacheLimit) graphCache.pop()
}

function isDrivableWay(tags: OsmTags) {
  const highway = tags.highway
  if (!highway) return false

  const excluded = new Set([
    'bridleway',
    'bus_guideway',
    'construction',
    'corridor',
    'cycleway',
    'footway',
    'path',
    'pedestrian',
    'platform',
    'proposed',
    'raceway',
    'steps',
    'track',
  ])
  if (excluded.has(highway) || tags.area === 'yes') return false

  return !['no', 'private'].includes((tags.access || '').toLowerCase()) &&
    !['no', 'private'].includes((tags.vehicle || '').toLowerCase()) &&
    !['no', 'private'].includes((tags.motor_vehicle || '').toLowerCase())
}

function speedFromTag(value: string | undefined) {
  if (!value) return undefined
  const match = value.match(/\d+(?:\.\d+)?/)
  if (!match) return undefined
  const parsed = Number(match[0])
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined
  const kilometersPerHour = /mph/i.test(value) ? parsed * 1.609_344 : parsed
  return Math.min(130, Math.max(5, kilometersPerHour)) / 3.6
}

function assumedSpeedMetersPerSecond(highway: string) {
  const speedKph: Record<string, number> = {
    motorway: 100,
    motorway_link: 50,
    trunk: 80,
    trunk_link: 45,
    primary: 60,
    primary_link: 40,
    secondary: 50,
    secondary_link: 35,
    tertiary: 45,
    tertiary_link: 30,
    unclassified: 35,
    residential: 30,
    living_street: 10,
    service: 15,
  }
  return (speedKph[highway] || 30) / 3.6
}

function speedForDirection(tags: OsmTags, forward: boolean) {
  return (
    speedFromTag(forward ? tags['maxspeed:forward'] : tags['maxspeed:backward']) ||
    speedFromTag(tags.maxspeed) ||
    assumedSpeedMetersPerSecond(tags.highway || '')
  )
}

function wayDirection(tags: OsmTags) {
  const oneway = (tags.oneway || '').trim().toLowerCase()
  if (oneway === '-1') return 'reverse' as const
  if (['yes', 'true', '1'].includes(oneway) || tags.junction === 'roundabout') return 'forward' as const
  return 'both' as const
}

function ensureGraphNode(graph: RoadGraph, node: { id: string; latitude: number; longitude: number }) {
  let graphNode = graph.get(node.id)
  if (!graphNode) {
    graphNode = { ...node, edges: [] }
    graph.set(node.id, graphNode)
  }
  return graphNode
}

function addRoadEdge(
  graph: RoadGraph,
  from: { id: string; latitude: number; longitude: number },
  to: { id: string; latitude: number; longitude: number },
  speedMetersPerSecond: number,
) {
  const segmentDistanceMeters = distanceMeters(from, to)
  if (segmentDistanceMeters <= 0 || !Number.isFinite(segmentDistanceMeters)) return

  const fromNode = ensureGraphNode(graph, from)
  ensureGraphNode(graph, to)
  fromNode.edges.push({
    to: to.id,
    distanceMeters: segmentDistanceMeters,
    cost: segmentDistanceMeters / speedMetersPerSecond,
  })
}

function xmlAttribute(source: string, attribute: string) {
  const match = source.match(new RegExp(`\\b${attribute}="([^"]*)"`))
  return match?.[1]
    ?.replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

function roadGraphFromOsmXml(xml: string): RoadGraph {
  const sourceNodes = new Map<string, { id: string; latitude: number; longitude: number }>()
  for (const match of xml.matchAll(/<node\b([^>]*?)(?:\/>|>[\s\S]*?<\/node>)/g)) {
    const id = xmlAttribute(match[1], 'id')
    const latitude = Number(xmlAttribute(match[1], 'lat'))
    const longitude = Number(xmlAttribute(match[1], 'lon'))
    if (!id || !Number.isFinite(latitude) || !Number.isFinite(longitude)) continue
    const node = { id, latitude, longitude }
    if (validPosition(node)) sourceNodes.set(id, node)
  }

  const graph: RoadGraph = new Map()
  for (const match of xml.matchAll(/<way\b[^>]*>([\s\S]*?)<\/way>/g)) {
    const contents = match[1]
    const tags: OsmTags = {}
    for (const tagMatch of contents.matchAll(/<tag\b([^>]*)\/>/g)) {
      const key = xmlAttribute(tagMatch[1], 'k')
      const value = xmlAttribute(tagMatch[1], 'v')
      if (key && value !== undefined) tags[key] = value
    }
    if (!isDrivableWay(tags)) continue

    const nodes = [...contents.matchAll(/<nd\b([^>]*)\/>/g)]
      .map((nodeMatch) => xmlAttribute(nodeMatch[1], 'ref'))
      .map((id) => (id ? sourceNodes.get(id) : undefined))
      .filter((node): node is { id: string; latitude: number; longitude: number } => Boolean(node))
    if (nodes.length < 2) continue

    const direction = wayDirection(tags)
    for (let index = 0; index < nodes.length - 1; index += 1) {
      const from = nodes[index]
      const to = nodes[index + 1]
      if (direction !== 'reverse') addRoadEdge(graph, from, to, speedForDirection(tags, true))
      if (direction !== 'forward') addRoadEdge(graph, to, from, speedForDirection(tags, false))
    }
  }

  return graph
}

function mergeRoadGraphs(graphs: RoadGraph[]) {
  const merged: RoadGraph = new Map()
  for (const graph of graphs) {
    for (const node of graph.values()) {
      const mergedNode = ensureGraphNode(merged, node)
      for (const edge of node.edges) {
        if (!mergedNode.edges.some((existing) => existing.to === edge.to && existing.cost === edge.cost)) {
          mergedNode.edges.push(edge)
        }
      }
    }
  }
  return merged
}

function splitBounds(bounds: Bounds) {
  const latitudeMiddle = (bounds.south + bounds.north) / 2
  const longitudeMiddle = (bounds.west + bounds.east) / 2
  return [
    { south: bounds.south, west: bounds.west, north: latitudeMiddle, east: longitudeMiddle },
    { south: bounds.south, west: longitudeMiddle, north: latitudeMiddle, east: bounds.east },
    { south: latitudeMiddle, west: bounds.west, north: bounds.north, east: longitudeMiddle },
    { south: latitudeMiddle, west: longitudeMiddle, north: bounds.north, east: bounds.east },
  ]
}

async function fetchOsmMapXml(bounds: Bounds) {
  const url = new URL(env.routing.osmMapApiUrl)
  url.searchParams.set('bbox', `${bounds.west.toFixed(6)},${bounds.south.toFixed(6)},${bounds.east.toFixed(6)},${bounds.north.toFixed(6)}`)
  let response: Response

  try {
    response = await fetch(url, {
      headers: { 'User-Agent': 'Voro/1.0 (A* delivery routing)' },
      signal: AbortSignal.timeout(env.routing.osmMapTimeoutMs),
    })
  } catch {
    throw new AStarRoutingError(502, 'Could not reach the OpenStreetMap road graph service.')
  }

  if (response.status === 400) throw new OsmMapLimitError()
  if (!response.ok) {
    throw new AStarRoutingError(502, 'Could not load the OpenStreetMap road graph.')
  }

  let xml: string
  try {
    xml = await response.text()
  } catch {
    throw new AStarRoutingError(502, 'OpenStreetMap returned unreadable road data.')
  }

  return roadGraphFromOsmXml(xml)
}

async function loadRoadGraphChunk(bounds: Bounds, remainingSplits: number): Promise<RoadGraph> {
  try {
    return await fetchOsmMapXml(bounds)
  } catch (error) {
    if (!(error instanceof OsmMapLimitError)) throw error
    if (remainingSplits === 0) {
      throw new AStarRoutingError(502, 'The OpenStreetMap road graph is too dense for this delivery area.')
    }

    const graphs: RoadGraph[] = []
    for (const tile of splitBounds(bounds)) {
      graphs.push(await loadRoadGraphChunk(tile, remainingSplits - 1))
    }
    return mergeRoadGraphs(graphs)
  }
}

async function loadRoadGraph(bounds: Bounds) {
  const cached = cachedGraphFor(bounds)
  if (cached) return cached

  // The standard OSM map API caps a single dense extract at 50,000 nodes.
  // Splitting preserves the same local road graph for A*; it never switches
  // to a third-party route calculator.
  const graph = await loadRoadGraphChunk(bounds, 3)
  if (graph.size < 2) throw new AStarRoutingError(404, 'No drivable roads were found near these locations.')
  cacheGraph(bounds, graph)
  return graph
}

function nearestRoadNode(
  graph: RoadGraph,
  position: RoutePosition,
  requiredConnection: 'outgoing' | 'incoming',
) {
  let nearest: RoadNode | undefined
  let nearestDistance = Number.POSITIVE_INFINITY
  const nodesWithIncomingRoad = requiredConnection === 'incoming'
    ? new Set([...graph.values()].flatMap((node) => node.edges.map((edge) => edge.to)))
    : undefined

  for (const node of graph.values()) {
    if (requiredConnection === 'outgoing' && node.edges.length === 0) continue
    if (requiredConnection === 'incoming' && !nodesWithIncomingRoad?.has(node.id)) continue
    const candidateDistance = distanceMeters(position, node)
    if (candidateDistance < nearestDistance) {
      nearest = node
      nearestDistance = candidateDistance
    }
  }

  if (!nearest || nearestDistance > maximumSnapDistanceMeters) {
    throw new AStarRoutingError(404, 'No accessible road is close enough to one of these locations.')
  }
  return { node: nearest, distanceMeters: nearestDistance }
}

function coordinatesForPath(start: RoutePosition, end: RoutePosition, graph: RoadGraph, nodeIds: string[]) {
  const positions = [start, ...nodeIds.map((id) => graph.get(id)).filter((node): node is RoadNode => Boolean(node)), end]
  const coordinates: Array<[number, number]> = []
  for (const position of positions) {
    const previous = coordinates[coordinates.length - 1]
    if (previous && distanceMeters({ latitude: previous[0], longitude: previous[1] }, position) < 0.2) continue
    coordinates.push([position.latitude, position.longitude])
  }
  return coordinates
}

export async function findAStarDrivingRoute(start: RoutePosition, end: RoutePosition) {
  const baseBounds = routeBounds(start, end)
  let lastNoRouteError: AStarRoutingError | undefined

  // A narrow initial graph keeps queries fast. If it cannot connect two road
  // components, repeat with enough adjacent streets for one-way detours.
  for (const expansionFactor of [1, 1.6, 2.25]) {
    try {
      const graph = await loadRoadGraph(expandBounds(baseBounds, expansionFactor))
      const startAnchor = nearestRoadNode(graph, start, 'outgoing')
      const endAnchor = nearestRoadNode(graph, end, 'incoming')
      const result = searchWithAStar(
        startAnchor.node.id,
        endAnchor.node.id,
        graph,
        (nodeId) => {
          const node = graph.get(nodeId)
          return node ? distanceMeters(node, endAnchor.node) / maximumRoadSpeedMetersPerSecond : Number.POSITIVE_INFINITY
        },
      )

      if (!result) {
        lastNoRouteError = new AStarRoutingError(404, 'A* could not find a drivable route between these locations.')
        continue
      }

      const coordinates = coordinatesForPath(start, end, graph, result.nodes)
      if (coordinates.length < 2) {
        lastNoRouteError = new AStarRoutingError(404, 'A* could not construct a route between these locations.')
        continue
      }

      const routeDistanceMeters = coordinates.slice(1).reduce((total, [latitude, longitude], index) => (
        total + distanceMeters(
          { latitude: coordinates[index][0], longitude: coordinates[index][1] },
          { latitude, longitude },
        )
      ), 0)
      const endpointSeconds = (startAnchor.distanceMeters + endAnchor.distanceMeters) / endpointSpeedMetersPerSecond
      const etaMinutes = Math.max(1, Math.ceil((result.cost + endpointSeconds) / 60))

      return {
        coordinates,
        distanceMeters: Math.round(routeDistanceMeters),
        etaMinutes,
        etaRange: { min: etaMinutes, max: etaMinutes + Math.max(2, Math.ceil(etaMinutes * 0.15)) },
        algorithm: 'a-star' as const,
      }
    } catch (error) {
      if (error instanceof AStarRoutingError && error.status === 404) {
        lastNoRouteError = error
        continue
      }
      throw error
    }
  }

  throw lastNoRouteError || new AStarRoutingError(404, 'A* could not find a drivable route between these locations.')
}
