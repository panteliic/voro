import assert from 'node:assert/strict'
import { searchWithAStar, type AStarEdge } from '../services/aStarRouting'

const graph = new Map<string, readonly AStarEdge[]>([
  ['start', [{ to: 'slow', cost: 8 }, { to: 'fast', cost: 2 }]],
  ['slow', [{ to: 'goal', cost: 8 }]],
  ['fast', [{ to: 'goal', cost: 3 }]],
  ['goal', []],
])

const remainingCost = new Map([
  ['start', 5],
  ['slow', 8],
  ['fast', 3],
  ['goal', 0],
])

const route = searchWithAStar('start', 'goal', graph, (node) => remainingCost.get(node) || 0)
assert.deepEqual(route?.nodes, ['start', 'fast', 'goal'])
assert.equal(route?.cost, 5)
assert.equal(searchWithAStar('goal', 'start', graph, () => 0), null)

console.log('A* routing smoke test passed.')
