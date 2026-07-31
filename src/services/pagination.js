import api from './api';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGES = 100;

export async function fetchAllPages(endpoint, { params = {}, signal, pageSize = DEFAULT_PAGE_SIZE } = {}) {
  const items = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const response = await api.get(endpoint, { params: { ...params, page, limit: pageSize }, signal });
    const pageItems = response.data?.data ?? [];
    const pagination = response.data?.meta?.pagination;
    items.push(...pageItems);
    if (!pagination || page >= pagination.total_pages) return items;
  }
  throw new Error('Sayfalama güvenlik sınırına ulaşıldı.');
}

export function getPaginationMeta(response) {
  return response?.data?.meta?.pagination ?? {
    page: 1,
    limit: 0,
    total: response?.data?.data?.length ?? 0,
    total_pages: 1,
  };
}
