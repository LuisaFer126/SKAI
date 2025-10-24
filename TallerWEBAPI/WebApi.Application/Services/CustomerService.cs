using WebApi.Domain.Repositories;
using WebApi.Domain.Models;

using System.Collections.Generic;

namespace WebApi.Application.Services;

public class CustomerService
{
    // Dependencia del CONTRATO, no de la implementación de EF Core
    private readonly ICustomerRepository _customerRepository; 

    // Inyección de Dependencias: Recibe la interfaz
    public CustomerService(ICustomerRepository customerRepository)
    {
        _customerRepository = customerRepository;
    }

    // Lógica de negocio
    public  Task<IEnumerable<Customer>> GetAllCustomerAsync()
    {
        return  _customerRepository.GetAllAsync();
    }
    

    public Task<Customer> GetProductByIdAsync(int id)
    {
        return  _customerRepository.GetByIdAsync(id);
    }
    
    public Task AddCustomerAsync(Customer customer)
    {
        return _customerRepository.AddAsync(customer);
    }

    public Task UpdateCustomerAsync(Customer customer)
    {
        return _customerRepository.UpdateAsync(customer);
    }

    public Task DeleteCustomerAsync(int id)
    {
        return _customerRepository.DeleteAsync(id);
    }
}