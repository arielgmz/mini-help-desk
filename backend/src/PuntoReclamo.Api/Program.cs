using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.OpenApi;
using PuntoReclamo.Api.Controllers;
using PuntoReclamo.Api.Middleware;
using PuntoReclamo.Api.Security;
using PuntoReclamo.Application;
using PuntoReclamo.Infrastructure;
using PuntoReclamo.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddControllers(options =>
    {
        // La validación la hace FluentValidation (422 con ProblemDetails); MVC no debe exigir [Required] implícito.
        options.SuppressImplicitRequiredAttributeForNonNullableReferenceTypes = true;
    })
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()))
    .ConfigureApiBehaviorOptions(options =>
    {
        // JSON malformado o parámetros con tipo incorrecto: 400 en ProblemDetails, en español y sin los detalles
        // internos del parser (rutas JSON, número de línea, tipos .NET) que devuelve la respuesta por defecto.
        options.InvalidModelStateResponseFactory = context => InvalidRequestResponse.Create(context);
    });

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddAdminAuthentication(builder.Configuration);

// Freno a la fuerza bruta sobre el login: 10 intentos por minuto por IP.
builder.Services.AddRateLimiter(options =>
{
    options.AddPolicy(RateLimitPolicies.Login, context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));

    options.OnRejected = (context, _) =>
        new ValueTask(ProblemResponses.TooManyRequestsAsync(
            context.HttpContext, "Demasiados intentos de inicio de sesión. Espere un minuto e intente de nuevo."));
});

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:3000"];
builder.Services.AddCors(options => options.AddPolicy("Frontend", policy => policy
    .WithOrigins(allowedOrigins)
    .AllowAnyHeader()
    .AllowAnyMethod()));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Mini Punto de Reclamo API",
        Version = "v1",
        Description = "Registro y seguimiento de reclamos. Los endpoints /api/admin aceptan un JWT " +
                      "(POST /api/auth/login) o el header X-Api-Key."
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Description = "Token obtenido en POST /api/auth/login (pegue solo el token, sin 'Bearer ')."
    });

    options.AddSecurityDefinition("ApiKey", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.ApiKey,
        In = ParameterLocation.Header,
        Name = ApiKeyOptions.HeaderName,
        Description = "Clave de administración configurada en el servidor."
    });

    // Dos requisitos separados = alternativas: basta con uno de los dos.
    options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        [new OpenApiSecuritySchemeReference("Bearer", document)] = []
    });
    options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        [new OpenApiSecuritySchemeReference("ApiKey", document)] = []
    });
});

var app = builder.Build();

app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment() || app.Configuration.GetValue<bool>("Swagger:Enabled"))
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("Frontend");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", () => Results.Ok(new { status = "ok" })).ExcludeFromDescription();
app.MapControllers();

if (app.Configuration.GetValue("Database:ApplyMigrationsOnStartup", true))
{
    using var scope = app.Services.CreateScope();
    var initializer = scope.ServiceProvider.GetRequiredService<DbInitializer>();
    await initializer.MigrateAsync(app.Lifetime.ApplicationStopping);

    if (app.Configuration.GetValue("Database:Seed", true))
    {
        await initializer.SeedAsync(app.Lifetime.ApplicationStopping);
    }
}

app.Run();

public partial class Program;
