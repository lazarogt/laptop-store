import { z } from 'zod';
import { 
  insertUserSchema, insertProductSchema, 
  loginSchema, createReviewReqSchema,
  createOrderReqSchema, addWishlistReqSchema,
  cartItemSchema
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/auth/login' as const,
      input: loginSchema,
      responses: {
        200: z.any(),
        401: errorSchemas.unauthorized,
      }
    },
    register: {
      method: 'POST' as const,
      path: '/api/auth/register' as const,
      input: insertUserSchema,
      responses: {
        201: z.any(),
        400: errorSchemas.validation,
      }
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout' as const,
      responses: {
        200: z.object({ message: z.string() })
      }
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me' as const,
      responses: {
        200: z.any(),
        401: errorSchemas.unauthorized,
      }
    }
  },
  products: {
    list: {
      method: 'GET' as const,
      path: '/api/products' as const,
      responses: {
        200: z.array(z.any()),
      }
    },
    get: {
      method: 'GET' as const,
      path: '/api/products/:slug' as const,
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/products' as const,
      input: insertProductSchema,
      responses: {
        201: z.any(),
        401: errorSchemas.unauthorized,
      }
    },
    update: {
      method: 'PUT' as const,
      path: '/api/products/:id' as const,
      input: insertProductSchema.partial(),
      responses: {
        200: z.any(),
        401: errorSchemas.unauthorized,
      }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/products/:id' as const,
      responses: {
        204: z.void(),
        401: errorSchemas.unauthorized,
      }
    }
  },
  reviews: {
    list: {
      method: 'GET' as const,
      path: '/api/products/:id/reviews' as const,
      responses: {
        200: z.array(z.any())
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/products/:id/reviews' as const,
      input: createReviewReqSchema,
      responses: {
        201: z.any(),
        401: errorSchemas.unauthorized,
      }
    }
  },
  cart: {
    get: {
      method: 'GET' as const,
      path: '/api/cart' as const,
      responses: {
        200: z.array(z.any())
      }
    },
    add: {
      method: 'POST' as const,
      path: '/api/cart/items' as const,
      input: cartItemSchema,
      responses: {
        200: z.array(z.any())
      }
    },
    update: {
      method: 'PUT' as const,
      path: '/api/cart/items/:id' as const,
      input: z.object({ quantity: z.number().min(1) }),
      responses: {
        200: z.array(z.any())
      }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/cart/items/:id' as const,
      responses: {
        200: z.array(z.any())
      }
    }
  },
  wishlist: {
    list: {
      method: 'GET' as const,
      path: '/api/wishlist' as const,
      responses: {
        200: z.array(z.any())
      }
    },
    add: {
      method: 'POST' as const,
      path: '/api/wishlist/items' as const,
      input: addWishlistReqSchema,
      responses: {
        201: z.any(),
        401: errorSchemas.unauthorized,
      }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/wishlist/items/:id' as const,
      responses: {
        204: z.void(),
        401: errorSchemas.unauthorized,
      }
    }
  },
  orders: {
    listMy: {
      method: 'GET' as const,
      path: '/api/orders/my' as const,
      responses: {
        200: z.array(z.any()),
        401: errorSchemas.unauthorized,
      }
    },
    listAll: {
      method: 'GET' as const,
      path: '/api/orders' as const,
      responses: {
        200: z.array(z.any()),
        401: errorSchemas.unauthorized,
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/orders' as const,
      input: createOrderReqSchema,
      responses: {
        201: z.any(),
        401: errorSchemas.unauthorized,
      }
    },
    updateStatus: {
      method: 'PUT' as const,
      path: '/api/orders/:id/status' as const,
      input: z.object({ status: z.string() }),
      responses: {
        200: z.any(),
        401: errorSchemas.unauthorized,
      }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/orders/:id' as const,
      responses: {
        204: z.void(),
        401: errorSchemas.unauthorized,
      }
    }
  },
  telegram: {
    status: {
      method: 'GET' as const,
      path: '/api/telegram/status' as const,
      responses: {
        200: z.object({
          connected: z.boolean(),
          connectUrl: z.string().nullable(),
          botUsername: z.string().nullable(),
        }),
        401: errorSchemas.unauthorized,
      }
    }
  },
  users: {
    list: {
      method: 'GET' as const,
      path: '/api/users' as const,
      responses: {
        200: z.array(z.any()),
        401: errorSchemas.unauthorized,
      }
    },
    update: {
      method: 'PUT' as const,
      path: '/api/users/:id' as const,
      input: insertUserSchema.partial(),
      responses: {
        200: z.any(),
        401: errorSchemas.unauthorized,
      }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/users/:id' as const,
      responses: {
        204: z.void(),
        401: errorSchemas.unauthorized,
      }
    }
  },
  admin: {
    stats: {
      method: 'GET' as const,
      path: '/api/admin/stats' as const,
      responses: {
        200: z.object({
          totalUsers: z.number(),
          totalProducts: z.number(),
          totalOrders: z.number(),
          totalRevenue: z.string()
        }),
        401: errorSchemas.unauthorized,
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
