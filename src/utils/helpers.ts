/**
 * A generic response object.
 * @typedef {Object} TResponse
 * @property {boolean} success - whether the request was successful.
 * @property {string} [message] - a message to display to the user.
 * @property {any} [data] - the data returned from the request.
 */
export type TResponse<T = any> = {
  success: boolean;
  message?: string;
  data?: T;
};

/**
 * Takes in a function and returns a promise that will either resolve or reject.
 * @param {any} fn - the function to execute
 * @param {string} successMsg - the message to return if the function resolves
 * @returns {Promise<TResponse>} - a promise that resolves or rejects
 */
export const tryCatch = async (
  fn: any,
  successMsg: string,
): Promise<TResponse> => {
  try {
    const data = await fn();
    return {
      success: true,
      message: successMsg,
      data,
    };
  } catch (e) {
    return {
      success: false,
      message: e?.message ?? 'Something went wrong',
      data: null,
    };
  }
};

/**
 * A type for the raw query filters.
 * @typedef {object} RawQueryFilters
 * @property {object} [baseFilter] - The base filter to apply to the query.
 * @property {string} [q] - The query to apply to the filter.
 * @property {number} [page] - The page number to apply to the filter.
 * @property {number} [limit] - The limit to apply to the filter.
 * @property {string} [sort] - The sort to apply to the filter.
 * @property {string[]} [matchFields] - The fields to match against.
 */
export type RawQueryFilters = {
  baseFilter?: object;
  q?: string;
  page?: number;
  limit?: number;
  sort?: string;
  matchFields?: string[];
  extra?: object;
};

/**
 * A raw query function that can be used to query the database.
 * @param {any} repo - The repository to query.
 * @param {string} collection - The collection to query.
 * @param {RawQueryFilters} filters - The filters to apply to the query.
 * @returns {Promise<{count: number; items: any[]}>} - A promise that resolves to an object containing the count and items.
 */
export const rawQuery = async (
  repo: any,
  collection: string,
  filters: RawQueryFilters,
): Promise<{count: number; items: any[]}> => {
  const {
    baseFilter,
    q,
    page,
    limit,
    sort,
    matchFields = [],
    extra = {},
  } = filters;

  const filter: any = baseFilter ?? {};
  const options: any = {...extra};

  if (q) {
    filter['$or'] = matchFields.map(field => ({
      [field]: {$regex: q, $options: 'i'},
    }));
  }

  if (page && limit) {
    options.skip = (page - 1) * limit;
    options.limit = limit;
  }

  if (sort) {
    options.sort = sort.split(',').map((s: string) => s.split(' '));
  }

  const data: any = await repo.execute(collection, 'find', filter, options);
  const count = await repo.execute(collection, 'countDocuments', filter);

  return {
    count,
    items: await data.toArray(),
  };
};
