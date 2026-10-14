using FluentAssertions;
using PuntoReclamo.Domain.Enums;
using PuntoReclamo.Domain.Exceptions;
using PuntoReclamo.Domain.Services;

namespace PuntoReclamo.UnitTests.Domain;

public class ClaimStateMachineTests
{
    [Theory]
    [InlineData(ClaimStatus.Recibido, ClaimStatus.EnProceso, null)]
    [InlineData(ClaimStatus.Recibido, ClaimStatus.Rechazado, "No corresponde al banco.")]
    [InlineData(ClaimStatus.EnProceso, ClaimStatus.Resuelto, "Se devolvió el cobro.")]
    [InlineData(ClaimStatus.EnProceso, ClaimStatus.Rechazado, "Sin sustento.")]
    public void ValidTransitions_AreAllowed(ClaimStatus from, ClaimStatus to, string? comment)
    {
        var act = () => ClaimStateMachine.EnsureCanTransition(from, to, comment);

        act.Should().NotThrow();
    }

    [Theory]
    [InlineData(ClaimStatus.Recibido, ClaimStatus.Resuelto)]   // no se puede saltar EnProceso
    [InlineData(ClaimStatus.Recibido, ClaimStatus.Recibido)]
    [InlineData(ClaimStatus.EnProceso, ClaimStatus.Recibido)]  // no hay retroceso
    [InlineData(ClaimStatus.EnProceso, ClaimStatus.EnProceso)]
    [InlineData(ClaimStatus.Resuelto, ClaimStatus.EnProceso)]  // estados finales
    [InlineData(ClaimStatus.Resuelto, ClaimStatus.Rechazado)]
    [InlineData(ClaimStatus.Rechazado, ClaimStatus.EnProceso)]
    [InlineData(ClaimStatus.Rechazado, ClaimStatus.Resuelto)]
    public void InvalidTransitions_ThrowInvalidStatusTransition_EvenWithComment(ClaimStatus from, ClaimStatus to)
    {
        var act = () => ClaimStateMachine.EnsureCanTransition(from, to, "comentario");

        act.Should().Throw<InvalidStatusTransitionException>()
            .Which.From.Should().Be(from);
    }

    [Fact]
    public void InvalidTransition_WithoutComment_IsStillConflict_NotCommentError()
    {
        var act = () => ClaimStateMachine.EnsureCanTransition(ClaimStatus.Recibido, ClaimStatus.Resuelto, null);

        act.Should().Throw<InvalidStatusTransitionException>();
    }

    [Theory]
    [InlineData(ClaimStatus.EnProceso, ClaimStatus.Resuelto, null)]
    [InlineData(ClaimStatus.EnProceso, ClaimStatus.Resuelto, "")]
    [InlineData(ClaimStatus.EnProceso, ClaimStatus.Resuelto, "   ")]
    [InlineData(ClaimStatus.EnProceso, ClaimStatus.Rechazado, null)]
    [InlineData(ClaimStatus.Recibido, ClaimStatus.Rechazado, "  ")]
    public void FinalTarget_WithoutComment_ThrowsCommentRequired(ClaimStatus from, ClaimStatus to, string? comment)
    {
        var act = () => ClaimStateMachine.EnsureCanTransition(from, to, comment);

        act.Should().Throw<CommentRequiredException>().Which.To.Should().Be(to);
    }

    [Fact]
    public void EnProceso_DoesNotRequireComment()
    {
        ClaimStateMachine.RequiresComment(ClaimStatus.EnProceso).Should().BeFalse();
        ClaimStateMachine.RequiresComment(ClaimStatus.Resuelto).Should().BeTrue();
        ClaimStateMachine.RequiresComment(ClaimStatus.Rechazado).Should().BeTrue();
    }

    [Theory]
    [InlineData(ClaimStatus.Recibido, false)]
    [InlineData(ClaimStatus.EnProceso, false)]
    [InlineData(ClaimStatus.Resuelto, true)]
    [InlineData(ClaimStatus.Rechazado, true)]
    public void IsFinal_MatchesFinalStatuses(ClaimStatus status, bool expected) =>
        ClaimStateMachine.IsFinal(status).Should().Be(expected);
}
