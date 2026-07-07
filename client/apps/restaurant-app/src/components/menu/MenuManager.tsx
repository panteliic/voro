import { FormEvent, useMemo, useState } from 'react'
import { Button, Input, Textarea } from '@voro/ui'
import { PackagePlus } from 'lucide-react'
import { useI18n } from '../../i18n/i18n'
import type {
  CategoryForm,
  DashboardResponse,
  Product,
  ProductForm,
} from '../../types/restaurant'
import { emptyCategory, emptyProduct, productToForm } from '../../utils/forms'

type MenuManagerProps = {
  dashboard: DashboardResponse | null
  isSavingCategory: boolean
  isSavingProduct: boolean
  onCreateCategory: (payload: CategoryForm) => Promise<void>
  onSaveProduct: (payload: ProductForm, editingProductId: number | null) => Promise<void>
}

export function MenuManager({
  dashboard,
  isSavingCategory,
  isSavingProduct,
  onCreateCategory,
  onSaveProduct,
}: MenuManagerProps) {
  const { t } = useI18n()
  const [categoryForm, setCategoryForm] = useState(emptyCategory)
  const [productForm, setProductForm] = useState(emptyProduct)
  const [editingProductId, setEditingProductId] = useState<number | null>(null)

  const uncategorizedProducts = useMemo(
    () => (dashboard?.products || []).filter((product) => product.categoryId === null),
    [dashboard?.products],
  )

  const groupedProducts = useMemo(() => {
    const categories = dashboard?.categories || []

    return categories.map((category) => ({
      category,
      products: (dashboard?.products || []).filter((product) => product.categoryId === category.id),
    }))
  }, [dashboard])

  async function handleCreateCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onCreateCategory(categoryForm)
    setCategoryForm(emptyCategory)
  }

  async function handleSaveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onSaveProduct(productForm, editingProductId)
    setProductForm(emptyProduct)
    setEditingProductId(null)
  }

  function handleEditProduct(product: Product) {
    setProductForm(productToForm(product))
    setEditingProductId(product.id)
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[24rem_1fr]">
      <div className="grid gap-4 self-start">
        <section className="rounded-voro-lg border border-line bg-card p-4">
          <div className="flex items-center gap-2">
            <PackagePlus className="size-4 text-action" />
            <h2 className="font-bold">{t('menu.productEditor')}</h2>
          </div>
          <form className="mt-4 grid gap-3" onSubmit={handleSaveProduct}>
            <Input
              placeholder={t('menu.productName')}
              value={productForm.name}
              onChange={(event) =>
                setProductForm((current) => ({ ...current, name: event.target.value }))
              }
            />
            <select
              className="h-10 w-full rounded-voro-lg border border-line bg-card px-3 text-sm"
              value={productForm.categoryId}
              onChange={(event) =>
                setProductForm((current) => ({
                  ...current,
                  categoryId: event.target.value,
                }))
              }
            >
              <option value="">{t('menu.uncategorized')}</option>
              {(dashboard?.categories || []).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <Input
              inputMode="decimal"
              placeholder={t('menu.price')}
              value={productForm.price}
              onChange={(event) =>
                setProductForm((current) => ({ ...current, price: event.target.value }))
              }
            />
            <Input
              placeholder={t('menu.imageUrl')}
              value={productForm.imageUrl}
              onChange={(event) =>
                setProductForm((current) => ({ ...current, imageUrl: event.target.value }))
              }
            />
            <Textarea
              placeholder={t('menu.description')}
              value={productForm.description}
              onChange={(event) =>
                setProductForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
            <label className="flex items-center gap-2 text-sm font-bold">
              <input
                checked={productForm.isAvailable}
                className="size-4 accent-[var(--btn-primary-bg)]"
                type="checkbox"
                onChange={(event) =>
                  setProductForm((current) => ({
                    ...current,
                    isAvailable: event.target.checked,
                  }))
                }
              />
              {t('menu.available')}
            </label>
            <div className="flex flex-wrap gap-2">
              <Button disabled={isSavingProduct} type="submit">
                {isSavingProduct
                  ? t('menu.saving')
                  : editingProductId
                    ? t('menu.updateProduct')
                    : t('menu.createProduct')}
              </Button>
              {editingProductId ? (
                <Button
                  onClick={() => {
                    setEditingProductId(null)
                    setProductForm(emptyProduct)
                  }}
                  type="button"
                  variant="outline"
                >
                  {t('menu.cancelEdit')}
                </Button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="rounded-voro-lg border border-line bg-card p-4">
          <h2 className="font-bold">{t('menu.newCategory')}</h2>
          <form className="mt-4 grid gap-3" onSubmit={handleCreateCategory}>
            <Input
              placeholder={t('menu.categoryPlaceholder')}
              value={categoryForm.name}
              onChange={(event) =>
                setCategoryForm((current) => ({ ...current, name: event.target.value }))
              }
            />
            <Textarea
              placeholder={t('menu.shortDescription')}
              value={categoryForm.description}
              onChange={(event) =>
                setCategoryForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
            <Button disabled={isSavingCategory} type="submit" variant="outline">
              {isSavingCategory ? t('menu.saving') : t('menu.createCategory')}
            </Button>
          </form>
        </section>
      </div>

      <section className="grid gap-3">
        {[...groupedProducts, {
          category: { id: 0, name: 'Uncategorized', description: '' },
          products: uncategorizedProducts,
        }].map(({ category, products }) => (
          <div className="rounded-voro-lg border border-line bg-card p-4" key={category.id}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-bold">{category.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {category.description || t('menu.section')}
                </p>
              </div>
              <span className="shrink-0 rounded-voro-md bg-muted px-2 py-1 text-xs font-bold">
                {t('menu.itemsCount', { count: products.length })}
              </span>
            </div>
            <div className="mt-3 grid gap-2">
              {products.map((product) => (
                <div
                  className="grid gap-3 rounded-voro-md border border-line px-3 py-3 md:grid-cols-[1fr_auto]"
                  key={product.id}
                >
                  <div className="min-w-0">
                    <p className="font-bold">{product.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {product.description || t('menu.noDescription')}
                    </p>
                    <p className="mt-2 text-xs font-bold text-muted-foreground">
                      {product.isAvailable ? t('menu.available') : t('menu.hidden')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 md:justify-end">
                    <p className="font-bold">{product.price.toFixed(2)} RSD</p>
                    <Button
                      onClick={() => handleEditProduct(product)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      {t('menu.edit')}
                    </Button>
                  </div>
                </div>
              ))}
              {products.length === 0 ? (
                <p className="rounded-voro-md border border-dashed border-line px-3 py-3 text-sm text-muted-foreground">
                  {t('menu.empty')}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </section>
    </section>
  )
}
