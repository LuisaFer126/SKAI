using Microsoft.EntityFrameworkCore;
using WebApi.Domain.Models;

namespace WebApi.Infraestructure.Data;

public class AppDbContext: DbContext
{
    public DbSet<Customer> Customers { get; set; } = null!;
    public DbSet<Order> Orders { get; set; } = null!;
    public DbSet<Product> Products {get;set;}
    public DbSet<OrderDetail> OrderDetails { get; set; } = null!;
    
    public AppDbContext (DbContextOptions<AppDbContext> options) : base(options){}
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Customer>()
            .HasIndex(c => c.Email)
            .IsUnique();
        
        modelBuilder.Entity<Order>()
            .Property(o => o.Status)
            .HasConversion<string>();
        
        base.OnModelCreating(modelBuilder);
    }
}