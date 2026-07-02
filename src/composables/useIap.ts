import { ref } from "vue";
import {
  acknowledgePurchase,
  consumePurchase,
  getProductStatus,
  getProducts,
  getPurchaseHistory,
  onPurchaseUpdated,
  purchase,
  restorePurchases,
  type GetProductsResponse,
  type GetPurchaseHistoryResponse,
  type ProductStatus,
  type Purchase,
  type PurchaseOptions,
  type RestorePurchasesResponse,
} from "@choochmeque/tauri-plugin-iap-api";

export type IapProductType = "subs" | "inapp";

export interface IapErrorShape {
  message: string;
}

export function useIap() {
  const isLoading = ref(false);
  const error = ref<IapErrorShape | null>(null);
  const lastPurchase = ref<Purchase | null>(null);

  async function run<T>(fn: () => Promise<T>) {
    isLoading.value = true;
    error.value = null;
    try {
      return await fn();
    } catch (err) {
      error.value = {
        message: err instanceof Error ? err.message : String(err),
      };
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  function fetchProducts(productIds: string[], productType: IapProductType = "subs") {
    return run<GetProductsResponse>(() => getProducts(productIds, productType));
  }

  async function purchaseProduct(
    productId: string,
    productType: IapProductType = "subs",
    options?: PurchaseOptions,
  ) {
    const result = await run<Purchase>(() => purchase(productId, productType, options));
    lastPurchase.value = result;
    return result;
  }

  function restore(productType: IapProductType = "subs") {
    return run<RestorePurchasesResponse>(() => restorePurchases(productType));
  }

  function getStatus(productId: string, productType: IapProductType = "subs") {
    return run<ProductStatus>(() => getProductStatus(productId, productType));
  }

  function history() {
    return run<GetPurchaseHistoryResponse>(() => getPurchaseHistory());
  }

  function acknowledge(token: string) {
    return run<void>(() => acknowledgePurchase(token));
  }

  function consume(token: string) {
    return run<void>(() => consumePurchase(token));
  }

  function onUpdated(callback: (purchaseUpdate: Purchase) => void) {
    return onPurchaseUpdated(callback);
  }

  return {
    isLoading,
    error,
    lastPurchase,
    fetchProducts,
    purchaseProduct,
    restore,
    getStatus,
    history,
    acknowledge,
    consume,
    onUpdated,
  };
}
