import { UpdateCategoryUseCase } from './update-category.use-case';
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

describe('UpdateCategoryUseCase', () => {
  let categories: jest.Mocked<CategoryRepository>;
  let useCase: UpdateCategoryUseCase;

  beforeEach(() => {
    categories = {
      create: jest.fn(),
      findByIdWithOwner: jest.fn(),
      listByRestaurant: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    useCase = new UpdateCategoryUseCase(categories);
  });

  it('updates when the actor owns the parent restaurant', async () => {
    categories.findByIdWithOwner.mockResolvedValue({
      category: makeCategory(),
      ownerId: 'owner-1',
    });
    const updated = makeCategory({ name: 'Mains', sortOrder: 2 });
    categories.update.mockResolvedValue(updated);

    const result = await useCase.execute({
      id: 'c1',
      actor: { userId: 'owner-1', role: 'RESTAURANT_OWNER' },
      data: { name: 'Mains', sortOrder: 2 },
    });

    expect(categories.update).toHaveBeenCalledWith('c1', {
      name: 'Mains',
      sortOrder: 2,
    });
    expect(result).toBe(updated);
  });

  it('lets an ADMIN update a category they do not own', async () => {
    categories.findByIdWithOwner.mockResolvedValue({
      category: makeCategory(),
      ownerId: 'owner-1',
    });
    categories.update.mockResolvedValue(makeCategory());

    await useCase.execute({
      id: 'c1',
      actor: { userId: 'admin-9', role: 'ADMIN' },
      data: { sortOrder: 5 },
    });

    expect(categories.update).toHaveBeenCalled();
  });

  it('rejects a non-owner with ForbiddenOwnership (403) and does not update', async () => {
    categories.findByIdWithOwner.mockResolvedValue({
      category: makeCategory(),
      ownerId: 'owner-1',
    });

    await expect(
      useCase.execute({
        id: 'c1',
        actor: { userId: 'someone-else', role: 'RESTAURANT_OWNER' },
        data: { name: 'Hijacked' },
      }),
    ).rejects.toBeInstanceOf(ForbiddenOwnershipError);
    expect(categories.update).not.toHaveBeenCalled();
  });

  it('throws CategoryNotFound (404) before ownership when missing/hidden', async () => {
    categories.findByIdWithOwner.mockResolvedValue(null);

    await expect(
      useCase.execute({
        id: 'c1',
        actor: { userId: 'owner-1', role: 'RESTAURANT_OWNER' },
        data: { name: 'New' },
      }),
    ).rejects.toBeInstanceOf(CategoryNotFoundError);
    expect(categories.update).not.toHaveBeenCalled();
  });
});
