import { GetCategoryUseCase } from './get-category.use-case';
import { CategoryNotFoundError } from '../domain/errors/domain.error';
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

describe('GetCategoryUseCase', () => {
  let categories: jest.Mocked<CategoryRepository>;
  let useCase: GetCategoryUseCase;

  beforeEach(() => {
    categories = {
      create: jest.fn(),
      findByIdWithOwner: jest.fn(),
      listByRestaurant: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    useCase = new GetCategoryUseCase(categories);
  });

  it('returns the category when it (and its parent) are live', async () => {
    const category = makeCategory();
    categories.findByIdWithOwner.mockResolvedValue({
      category,
      ownerId: 'owner-1',
    });

    await expect(useCase.execute('c1')).resolves.toBe(category);
  });

  it('throws CategoryNotFound when the repo returns null (missing / soft-deleted / hidden parent)', async () => {
    categories.findByIdWithOwner.mockResolvedValue(null);

    await expect(useCase.execute('c1')).rejects.toBeInstanceOf(
      CategoryNotFoundError,
    );
  });
});
