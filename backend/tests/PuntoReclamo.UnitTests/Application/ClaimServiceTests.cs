using FluentAssertions;
using FluentValidation;
using Microsoft.Extensions.Time.Testing;
using PuntoReclamo.Application.Contracts;
using PuntoReclamo.Application.Exceptions;
using PuntoReclamo.Application.Services;
using PuntoReclamo.Application.Validators;
using PuntoReclamo.Domain.Exceptions;
using PuntoReclamo.UnitTests.Support;

namespace PuntoReclamo.UnitTests.Application;

public class ClaimServiceTests
{
    // Lunes 2026-10-12 10:00 UTC
    private static readonly DateTimeOffset Start = new(2026, 10, 12, 10, 0, 0, TimeSpan.Zero);

    private readonly FakeTimeProvider _clock = new(Start);
    private readonly FakeClaimRepository _repository = new();
    private readonly ClaimService _service;

    public ClaimServiceTests()
    {
        _service = new ClaimService(
            _repository,
            new FolioGenerator(new FakeFolioSequence(), _clock),
            _clock,
            new CreateClaimRequestValidator(),
            new ChangeStatusRequestValidator(),
            new ListClaimsQueryValidator());
    }

    private static CreateClaimRequest ValidRequest(string email = "ana@example.com") => new(
        "Ana Pérez", "1234567", email, "70012345", "Cobros",
        "Me cobraron una comisión que no corresponde a mi cuenta.");

    [Fact]
    public async Task Create_SetsReceivedStatus_FolioAndDueDateInFiveBusinessDays()
    {
        var response = await _service.CreateAsync(ValidRequest(), CancellationToken.None);

        response.Folio.Should().Be("REC-2026-000001");
        response.Status.Should().Be("Recibido");
        response.CreatedAt.Should().Be(Start.UtcDateTime);
        response.DueDate.Should().Be(new DateTime(2026, 10, 19, 10, 0, 0, DateTimeKind.Utc));
        _repository.SaveCount.Should().Be(1);
    }

    [Fact]
    public async Task Create_RecordsInitialHistoryEntry()
    {
        var created = await _service.CreateAsync(ValidRequest(), CancellationToken.None);

        var tracking = await _service.GetTrackingAsync(created.Folio, "ana@example.com", CancellationToken.None);

        tracking.History.Should().ContainSingle()
            .Which.Should().Match<ClaimHistoryItemResponse>(h => h.FromStatus == null && h.ToStatus == "Recibido");
    }

    [Fact]
    public async Task Create_WithInvalidData_ThrowsValidationException_AndDoesNotPersist()
    {
        var request = ValidRequest() with { Email = "no-es-email", Phone = "12ab", Description = "corta" };

        var act = () => _service.CreateAsync(request, CancellationToken.None);

        var ex = await act.Should().ThrowAsync<ValidationException>();
        ex.Which.Errors.Select(e => e.PropertyName)
            .Should().Contain([nameof(CreateClaimRequest.Email), nameof(CreateClaimRequest.Phone), nameof(CreateClaimRequest.Description)]);
        _repository.Claims.Should().BeEmpty();
    }

    [Fact]
    public async Task GetTracking_UnknownFolioAndWrongEmail_ProduceIdenticalError()
    {
        var created = await _service.CreateAsync(ValidRequest(), CancellationToken.None);

        var unknownFolio = async () => await _service.GetTrackingAsync("REC-2026-999999", "ana@example.com", CancellationToken.None);
        var wrongEmail = async () => await _service.GetTrackingAsync(created.Folio, "otra@example.com", CancellationToken.None);
        var noEmail = async () => await _service.GetTrackingAsync(created.Folio, null, CancellationToken.None);

        var a = (await unknownFolio.Should().ThrowAsync<ClaimNotFoundException>()).Which;
        var b = (await wrongEmail.Should().ThrowAsync<ClaimNotFoundException>()).Which;
        await noEmail.Should().ThrowAsync<ClaimNotFoundException>();
        a.Message.Should().Be(b.Message);
    }

    [Fact]
    public async Task GetTracking_RequiresExactEmailMatch()
    {
        var created = await _service.CreateAsync(ValidRequest("ana@example.com"), CancellationToken.None);

        var act = () => _service.GetTrackingAsync(created.Folio, "ANA@example.com", CancellationToken.None);

        await act.Should().ThrowAsync<ClaimNotFoundException>();
    }

    [Fact]
    public async Task ChangeStatus_FullFlow_RecordsHistoryAndResolvedAt()
    {
        var created = await _service.CreateAsync(ValidRequest(), CancellationToken.None);

        _clock.Advance(TimeSpan.FromHours(1));
        await _service.ChangeStatusAsync(created.Folio, new ChangeStatusRequest("EnProceso", null), CancellationToken.None);
        _clock.Advance(TimeSpan.FromHours(1));
        var resolved = await _service.ChangeStatusAsync(created.Folio, new ChangeStatusRequest("Resuelto", "Cobro revertido."), CancellationToken.None);

        resolved.Status.Should().Be("Resuelto");
        resolved.ResolvedAt.Should().Be(_clock.GetUtcNow().UtcDateTime);

        var tracking = await _service.GetTrackingAsync(created.Folio, "ana@example.com", CancellationToken.None);
        tracking.History.Select(h => h.ToStatus).Should().Equal("Recibido", "EnProceso", "Resuelto");
        tracking.History.Last().Comment.Should().Be("Cobro revertido.");
    }

    [Fact]
    public async Task ChangeStatus_InvalidTransition_ThrowsInvalidStatusTransition()
    {
        var created = await _service.CreateAsync(ValidRequest(), CancellationToken.None);

        var act = () => _service.ChangeStatusAsync(created.Folio, new ChangeStatusRequest("Resuelto", "Intento de salto."), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidStatusTransitionException>();
    }

    [Fact]
    public async Task ChangeStatus_RejectWithoutComment_ThrowsCommentRequired_AndKeepsStatus()
    {
        var created = await _service.CreateAsync(ValidRequest(), CancellationToken.None);

        var act = () => _service.ChangeStatusAsync(created.Folio, new ChangeStatusRequest("Rechazado", " "), CancellationToken.None);

        await act.Should().ThrowAsync<CommentRequiredException>();
        _repository.Claims.Single().Status.ToString().Should().Be("Recibido");
    }

    [Fact]
    public async Task ChangeStatus_UnknownStatusName_ThrowsValidationException()
    {
        var created = await _service.CreateAsync(ValidRequest(), CancellationToken.None);

        var act = () => _service.ChangeStatusAsync(created.Folio, new ChangeStatusRequest("1", null), CancellationToken.None);

        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task ChangeStatus_UnknownFolio_ThrowsNotFound()
    {
        var act = () => _service.ChangeStatusAsync("REC-2026-000999", new ChangeStatusRequest("EnProceso", null), CancellationToken.None);

        await act.Should().ThrowAsync<ClaimNotFoundException>();
    }

    [Fact]
    public async Task List_FlagsOverdueOnlyForNonFinalClaimsPastDueDate()
    {
        var open = await _service.CreateAsync(ValidRequest(), CancellationToken.None);
        var closed = await _service.CreateAsync(ValidRequest("b@example.com"), CancellationToken.None);
        await _service.ChangeStatusAsync(closed.Folio, new ChangeStatusRequest("Rechazado", "No procede."), CancellationToken.None);

        _clock.Advance(TimeSpan.FromDays(10)); // ambos vencidos por fecha

        var page = await _service.ListAsync(new ListClaimsQuery(null), CancellationToken.None);

        page.Items.Single(c => c.Folio == open.Folio).IsOverdue.Should().BeTrue();
        page.Items.Single(c => c.Folio == closed.Folio).IsOverdue.Should().BeFalse();
    }

    [Fact]
    public async Task List_FiltersByStatus_AndPaginates()
    {
        for (var i = 0; i < 3; i++)
        {
            await _service.CreateAsync(ValidRequest($"u{i}@example.com"), CancellationToken.None);
        }
        var first = _repository.Claims[0].Folio;
        await _service.ChangeStatusAsync(first, new ChangeStatusRequest("EnProceso", null), CancellationToken.None);

        var received = await _service.ListAsync(new ListClaimsQuery("recibido", 1, 1), CancellationToken.None);
        var inProgress = await _service.ListAsync(new ListClaimsQuery("EnProceso"), CancellationToken.None);

        received.TotalCount.Should().Be(2);
        received.TotalPages.Should().Be(2);
        received.Items.Should().HaveCount(1);
        inProgress.Items.Should().ContainSingle().Which.Folio.Should().Be(first);
    }

    [Theory]
    [InlineData(0, 10)]
    [InlineData(1, 0)]
    [InlineData(1, 101)]
    public async Task List_InvalidPaging_ThrowsValidationException(int page, int pageSize)
    {
        var act = () => _service.ListAsync(new ListClaimsQuery(null, page, pageSize), CancellationToken.None);

        await act.Should().ThrowAsync<ValidationException>();
    }
}
