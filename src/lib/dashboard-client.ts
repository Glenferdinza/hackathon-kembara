export interface DashboardSummaryResponse {
  kpi: {
    totalPhysicalUnits: number;
    totalAvailable: number;
    totalBorrowed: number;
    totalToolTypes: number;
    totalToolUnits: number;
    availableTools: number;
    borrowedTools: number;
    totalInventoryTypes: number;
    totalInventoryUnits: number;
    availableInventories: number;
    borrowedInventories: number;
    activeLoansCount: number;
    overdueLoansCount: number;
    dueSoonCount: number;
    lowStockCount: number;
  };
  barChartData: Array<{
    name: string;
    total: number;
    available: number;
    borrowed: number;
  }>;
  donutChartData: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  actionItems: Array<{
    id: string;
    dismissKey?: string;
    type: string;
    urgent?: boolean;
    title: string;
    description: string;
    link: string;
  }>;
  upcomingLoans: Array<{
    id: string;
    transactionNumber: string;
    borrowerName: string;
    borrowerNik: string;
    borrowerDept: string;
    borrowerPhone?: string | null;
    itemsSummary: string;
    loanDate: string;
    expectedReturnDate: string;
    statusLabel: string;
  }>;
  allStockItems: Array<{
    id: string;
    code: string;
    name: string;
    type: string;
    category: string;
    location: string;
    totalStock: number;
    availableStock: number;
    borrowedStock: number;
    repairStock: number;
    minStock: number;
    unit: string;
    isLowStock: boolean;
  }>;
  notifications: Array<{
    id: string;
    createdAt: string;
    type: string;
    title: string;
    message: string;
    link?: string | null;
  }>;
}

export interface HeaderSummaryResponse {
  kpi: Partial<DashboardSummaryResponse['kpi']>;
  actionItems: DashboardSummaryResponse['actionItems'];
  notifications: DashboardSummaryResponse['notifications'];
}

const CACHE_TTL_MS = 3000;
let cachedData: DashboardSummaryResponse | null = null;
let cachedAt = 0;
let inFlightPromise: Promise<DashboardSummaryResponse | null> | null = null;

let cachedSummaryData: HeaderSummaryResponse | null = null;
let cachedSummaryAt = 0;
let inFlightSummaryPromise: Promise<HeaderSummaryResponse | null> | null = null;

/**
 * Deduplicates simultaneous `/api/dashboard` calls across AppShell, Header, and DashboardPage.
 */
export async function fetchDashboardSummary(forceRefresh = false): Promise<DashboardSummaryResponse | null> {
  const now = Date.now();
  if (!forceRefresh && cachedData && now - cachedAt < CACHE_TTL_MS) {
    return cachedData;
  }

  if (!forceRefresh && inFlightPromise) {
    return inFlightPromise;
  }

  const req = fetch('/api/dashboard')
    .then(async (res) => {
      if (!res.ok) return null;
      const json = (await res.json()) as DashboardSummaryResponse;
      cachedData = json;
      cachedAt = Date.now();
      cachedSummaryData = json;
      cachedSummaryAt = cachedAt;
      return json;
    })
    .catch(() => null)
    .finally(() => {
      if (inFlightPromise === req) {
        inFlightPromise = null;
      }
    });

  inFlightPromise = req;
  return req;
}

/**
 * Lightweight summary fetch for AppShell & Header (reuses full cache on `/`, otherwise `?summaryOnly=1`).
 */
export async function fetchHeaderSummary(forceRefresh = false): Promise<HeaderSummaryResponse | null> {
  const now = Date.now();
  if (!forceRefresh && cachedData && now - cachedAt < CACHE_TTL_MS) {
    return cachedData;
  }
  if (!forceRefresh && inFlightPromise) {
    return inFlightPromise;
  }
  if (!forceRefresh && cachedSummaryData && now - cachedSummaryAt < CACHE_TTL_MS) {
    return cachedSummaryData;
  }
  if (!forceRefresh && inFlightSummaryPromise) {
    return inFlightSummaryPromise;
  }

  const req = fetch('/api/dashboard?summaryOnly=1')
    .then(async (res) => {
      if (!res.ok) return null;
      const json = (await res.json()) as HeaderSummaryResponse;
      cachedSummaryData = json;
      cachedSummaryAt = Date.now();
      return json;
    })
    .catch(() => null)
    .finally(() => {
      if (inFlightSummaryPromise === req) {
        inFlightSummaryPromise = null;
      }
    });

  inFlightSummaryPromise = req;
  return req;
}

export function invalidateDashboardSummaryCache() {
  cachedData = null;
  cachedAt = 0;
  inFlightPromise = null;
  cachedSummaryData = null;
  cachedSummaryAt = 0;
  inFlightSummaryPromise = null;
}
