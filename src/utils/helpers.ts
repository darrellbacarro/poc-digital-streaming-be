export type TResponse<T = any> = {
  success: boolean;
  message?: string;
  data?: T;
};

export const tryCatch = async (fn: any, msg: string): Promise<TResponse> => {
  try {
    const data = await fn();
    return {
      success: true,
      message: msg,
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
