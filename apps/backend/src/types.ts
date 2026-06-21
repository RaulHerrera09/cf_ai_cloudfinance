export type Bindings = {
  AI: any;
  DB: D1Database;
  JWT_SECRET: string;
};

export type Variables = {
  user: {
    id: string;
    email: string;
    name: string;
  };
};
