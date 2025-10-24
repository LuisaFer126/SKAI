using WebApi.Domain.Models;
using WebApi.Domain.Repositories;

namespace WebApi.Application.Services;

public class ProductService
{
    private readonly IProductRepository _productRepository;

    public ProductService(IProductRepository productRepository)
    {
        _productRepository = productRepository;
    }

    public Task<IEnumerable<Product>> GetAllProductAsync()
    {
        return _productRepository.GetAllAsync();
    }

    public Task<Product?> GetProductByIdAsync(int id)
    {
        return _productRepository.GetByIdAsync(id);
    }

    public Task AddProductAsync(Product product)
    {
        return _productRepository.AddAsync(product);
    }

    public Task UpdateProductAsync(Product product)
    {
        return _productRepository.UpdateAsync(product);
    }

    public Task DeleteProductAsync(int id)
    {
        return _productRepository.DeleteAsync(id);
    }
}