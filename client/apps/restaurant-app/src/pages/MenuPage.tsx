import { MenuManager } from '../components/menu/MenuManager'
import type { CategoryForm, DashboardResponse, ProductForm } from '../types/restaurant'

type MenuPageProps = {
  dashboard: DashboardResponse | null
  isSavingCategory: boolean
  isSavingProduct: boolean
  onCreateCategory: (payload: CategoryForm) => Promise<void>
  onSaveProduct: (payload: ProductForm, editingProductId: number | null) => Promise<void>
}

export function MenuPage({
  dashboard,
  isSavingCategory,
  isSavingProduct,
  onCreateCategory,
  onSaveProduct,
}: MenuPageProps) {
  return (
    <MenuManager
      dashboard={dashboard}
      isSavingCategory={isSavingCategory}
      isSavingProduct={isSavingProduct}
      onCreateCategory={onCreateCategory}
      onSaveProduct={onSaveProduct}
    />
  )
}
