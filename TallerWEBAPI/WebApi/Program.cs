using WebApi.Application.Services;
using WebApi.Domain.Repositories;
using WebApi.Infraestructure;
using WebApi.Infraestructure.Repositories;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
 ?? throw new InvalidOperationException("La cadena de conexión 'DefaultConnection' no fue encontrada.");

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Añadir controladores
builder.Services.AddControllers();

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.AddInfrastructure(connectionString);

    
builder.Services.AddScoped<ICustomerRepository, EfCustomerRepository>();
builder.Services.AddScoped<CustomerService>(); 

builder.Services.AddScoped<IProductRepository, EfProductRepository>();
builder.Services.AddScoped<ProductService>();



var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "My API V1");
        // Optional: Set a custom route for the Swagger UI
        // c.RoutePrefix = string.Empty; // To serve Swagger UI at the application's root
    });
}

app.UseHttpsRedirection();

// Habilitar los endpoints
app.MapControllers();

app.Run();