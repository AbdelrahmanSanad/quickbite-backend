import { SoftDeleteCategoryUseCase } from './soft-delete-category.use-case';
import {
  CategoryNotFoundError,
  ForbiddenOwnershipError,
} from '../domain/errors/domain.error';
import type { CategoryRepository } from '../domain/ports/category-repository.port';
import { Category } from '../domain/category';

function makeCategory(over: Partial<Category> = {}): Category {
  return {
    id: 'c1',
    restaurantId: 'r1',
    name: 'Starters',
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...over,
  };
}

describe('SoftDeleteCategoryUseCase', () => {
  let categories: jest.Mocked<CategoryRepository>;
  let useCase: SoftDeleteCategoryUseCase;

  beforeEach(() => {
    categories = {
      create: jest.fn(),
      findByIdWithOwner: jest.fn(),
      listByRestaurant: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    useCase = new SoftDeleteCategoryUseCase(categories);
  });

  it('soft-deletes when the actor owns the parent restaurant', async () => {
    categories.findByIdWithOwner.mockResolvedValue({
      category: makeCategory(),
      ownerId: 'owner-1',
    });

    await useCase.execute({
      id: 'c1',
      actor: { userId: 'owner-1', role: 'RESTAURANT_OWNER' },
    });

    expect(categories.softDelete).toHaveBeenCalledWith('c1');
  });

  it('lets an ADMIN soft-delete a category they do not own', async () => {
    categories.findByIdWithOwner.mockResolvedValue({
      category: makeCategory(),
      ownerId: 'owner-1',
    });

    await useCase.execute({
      id: 'c1',
      actor: { userId: 'admin-9', role: 'ADMIN' },
    });

    expect(categories.softDelete).toHaveBeenCalledWith('c1');
  });

  it('rejects a non-owner with ForbiddenOwnership (403) and does not delete', async () => {
    categories.findByIdWithOwner.mockResolvedValue({
      category: makeCategory(),
      ownerId: 'owner-1',
    });

    await expect(
      useCase.execute({
        id: 'c1',
        actor: { userId: 'someone-else', role: 'RESTAURANT_OWNER' },
      }),
    ).rejects.toBeInstanceOf(ForbiddenOwnershipError);
    expect(categories.softDelete).not.toHaveBeenCalled();
  });

  it('throws CategoryNotFound (404) when missing/hidden', async () => {
    categories.findByIdWithOwner.mockResolvedValue(null);

    await expect(
      useCase.execute({
        id: 'c1',
        actor: { userId: 'owner-1', role: 'RESTAURANT_OWNER' },
      }),
    ).rejects.toBeInstanceOf(CategoryNotFoundError);
    expect(categories.softDelete).not.toHaveBeenCalled();
  });
});
