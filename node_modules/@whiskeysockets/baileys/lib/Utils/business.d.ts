import type { CatalogCollection, OrderDetails, Product, ProductCreate, ProductUpdate, WAMediaUpload, WAMediaUploadFunction } from '../Types/index.js';
import { type BinaryNode } from '../WABinary/index.js';
export declare const parseCatalogNode: (node: BinaryNode) => {
    products: Product[];
    nextPageCursor: any;
};
export declare const parseCollectionsNode: (node: BinaryNode) => {
    collections: CatalogCollection[];
};
export declare const parseOrderDetailsNode: (node: BinaryNode) => OrderDetails;
export declare const toProductNode: (productId: string | undefined, product: ProductCreate | ProductUpdate) => BinaryNode;
export declare const parseProductNode: (productNode: BinaryNode) => Product;
export declare function uploadingNecessaryImagesOfProduct<T extends ProductUpdate | ProductCreate>(product: T, waUploadToServer: WAMediaUploadFunction, timeoutMs?: number): Promise<T>;
export declare const uploadingNecessaryImages: (images: WAMediaUpload[], waUploadToServer: WAMediaUploadFunction, timeoutMs?: number) => Promise<{
    url: string;
}[]>;
//# sourceMappingURL=business.d.ts.map