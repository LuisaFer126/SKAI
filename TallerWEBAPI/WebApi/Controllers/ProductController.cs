using WebApi.Application.Services;
using WebApi.Domain.Models;
using Microsoft.AspNetCore.Mvc;

namespace WebApi.Controllers;

[Route("api/[controller]")]
[ApiController]

public class ProductController : ControllerBase
{
    private readonly ProductService _productService;
    
    public ProductController(ProductService productService)
    {
        _productService = productService;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var products = await _productService.GetAllProductAsync();
        if (products == null || !products.Any())
            return NoContent();
        
        return Ok(products);
    }

    [HttpPost]
    public async Task<IActionResult> Post([FromBody] Product product)
    {
        if (product == null)
            return BadRequest("Invalid Product");
        
        await _productService.AddProductAsync(product);
        return CreatedAtAction(nameof(Get), new { id = product.Id }, product);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var product = await _productService.GetProductByIdAsync(id);
        if (product == null)
            return NotFound();
        return Ok(product);
    }
}