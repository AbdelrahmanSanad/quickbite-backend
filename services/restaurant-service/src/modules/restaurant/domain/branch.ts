/**
 * Branch — a physical location of a Restaurant. Child of the Restaurant
 * aggregate: ownership and soft-delete visibility resolve up to the parent
 * restaurant. Transport- and ORM-agnostic (no NestJS/Prisma imports).
 */
export interface Branch {
  id: string;
  restaurantId: string;
  name: string;
  address: string;
  phone: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
