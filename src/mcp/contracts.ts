import type { CatalogContent, CatalogFilters, CatalogKind, CatalogMetadata } from '../typesCatalog';

/** Public, serializable projection: origin IDs and account identifiers never cross MCP. */
export interface PublicCatalogResource {
  id: string;
  kind: CatalogKind;
  metadata: CatalogMetadata;
  submissionId: string;
  state: 'published';
  publishedAt: string | null;
  updatedAt: string | null;
  canonicalUrl: string;
}

export interface CatalogSearchResult {
  resources: PublicCatalogResource[];
  total: number;
  nextCursor?: string;
}

export interface CatalogContentResult {
  resource: PublicCatalogResource;
  content: CatalogContent;
  repositoryFolderUrl: string | null;
}

export interface CatalogReader {
  search(filters: CatalogFilters, cursor?: string, limit?: number): Promise<CatalogSearchResult>;
  get(id: string): Promise<PublicCatalogResource>;
  content(id: string, expectedSubmissionId: string): Promise<CatalogContentResult>;
}

export class ResourceUnavailable extends Error {
  readonly code = 'resource_unavailable';
  constructor() {
    super('Este recurso no está disponible. Puede haber sido retirado o no estar publicado.');
    this.name = 'ResourceUnavailable';
  }
}

export class VersionChanged extends Error {
  readonly code = 'version_changed';
  constructor(readonly resource: PublicCatalogResource) {
    super('La publicación cambió. Actualiza la ficha antes de obtener su nueva versión.');
    this.name = 'VersionChanged';
  }
}

export class InvalidCatalogRequest extends Error {
  readonly code = 'invalid_catalog_request';
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCatalogRequest';
  }
}
