using System;
using System.Collections.Generic;

namespace WebApi.Domain.Models;


public enum OrderStatus
{
    Pendiente,
    Enviado,
    Cancelado
}
public class Order
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public DateTime OrderDate { get; set; }
    public OrderStatus Status { get; set; } = OrderStatus.Pendiente;
    
    public Customer? Customer { get; set; }
    public ICollection<OrderDetail> OrderDetails { get; set; } = new List<OrderDetail>();
}