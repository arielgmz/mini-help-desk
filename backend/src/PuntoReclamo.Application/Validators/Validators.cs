using FluentValidation;
using PuntoReclamo.Application.Common;
using PuntoReclamo.Application.Contracts;
using PuntoReclamo.Domain.Enums;

namespace PuntoReclamo.Application.Validators;

public sealed class CreateClaimRequestValidator : AbstractValidator<CreateClaimRequest>
{
    public CreateClaimRequestValidator()
    {
        RuleFor(x => x.FullName)
            .NotEmpty().WithMessage("El nombre completo es obligatorio.")
            .Length(3, 100).WithMessage("El nombre completo debe tener entre 3 y 100 caracteres.");

        RuleFor(x => x.DocumentId)
            .NotEmpty().WithMessage("El documento de identidad (CI) es obligatorio.")
            .Length(4, 20).WithMessage("El CI debe tener entre 4 y 20 caracteres.")
            .Matches(@"^[A-Za-z0-9][A-Za-z0-9\- ]*$")
            .WithMessage("El CI solo admite letras, números, espacios y guiones.");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("El correo electrónico es obligatorio.")
            .MaximumLength(254).WithMessage("El correo electrónico no puede superar 254 caracteres.")
            .EmailAddress().WithMessage("El correo electrónico no tiene un formato válido.");

        RuleFor(x => x.Phone)
            .Matches(@"^\d{7,15}$")
            .When(x => !string.IsNullOrEmpty(x.Phone))
            .WithMessage("El teléfono debe contener entre 7 y 15 dígitos numéricos.");

        RuleFor(x => x.ClaimType)
            .Must(EnumParser.IsValid<ClaimType>)
            .WithMessage($"El tipo de reclamo debe ser uno de: {EnumParser.Names<ClaimType>()}.");

        RuleFor(x => x.Description)
            .NotEmpty().WithMessage("La descripción es obligatoria.")
            .Length(20, 2000).WithMessage("La descripción debe tener entre 20 y 2000 caracteres.");
    }
}

public sealed class ChangeStatusRequestValidator : AbstractValidator<ChangeStatusRequest>
{
    public ChangeStatusRequestValidator()
    {
        RuleFor(x => x.Status)
            .Must(EnumParser.IsValid<ClaimStatus>)
            .WithMessage($"El estado debe ser uno de: {EnumParser.Names<ClaimStatus>()}.");

        RuleFor(x => x.Comment)
            .MaximumLength(1000).WithMessage("El comentario no puede superar 1000 caracteres.");
    }
}

public sealed class ListClaimsQueryValidator : AbstractValidator<ListClaimsQuery>
{
    public const int MaxPageSize = 100;

    public ListClaimsQueryValidator()
    {
        RuleFor(x => x.Status)
            .Must(EnumParser.IsValid<ClaimStatus>)
            .When(x => !string.IsNullOrWhiteSpace(x.Status))
            .WithMessage($"El estado debe ser uno de: {EnumParser.Names<ClaimStatus>()}.");

        RuleFor(x => x.Page)
            .GreaterThanOrEqualTo(1).WithMessage("La página debe ser mayor o igual a 1.");

        RuleFor(x => x.PageSize)
            .InclusiveBetween(1, MaxPageSize).WithMessage($"El tamaño de página debe estar entre 1 y {MaxPageSize}.");
    }
}
