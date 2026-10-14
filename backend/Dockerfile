# syntax=docker/dockerfile:1

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Primero solo los .csproj: la restauración queda en caché mientras no cambien las dependencias.
COPY src/PuntoReclamo.Domain/*.csproj src/PuntoReclamo.Domain/
COPY src/PuntoReclamo.Application/*.csproj src/PuntoReclamo.Application/
COPY src/PuntoReclamo.Infrastructure/*.csproj src/PuntoReclamo.Infrastructure/
COPY src/PuntoReclamo.Api/*.csproj src/PuntoReclamo.Api/
RUN dotnet restore src/PuntoReclamo.Api/PuntoReclamo.Api.csproj

COPY src/ src/
RUN dotnet publish src/PuntoReclamo.Api/PuntoReclamo.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app .
ENV ASPNETCORE_HTTP_PORTS=8080
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "PuntoReclamo.Api.dll"]
