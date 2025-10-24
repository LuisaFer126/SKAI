namespace WebApi.Domain.Models;

public class OrderDetail
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public double UnitPrice { get; set; }
    
    public Order? Order { get; set; }
}