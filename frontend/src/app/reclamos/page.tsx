import type { Metadata } from "next";
import { ClaimForm } from "@/components/ClaimForm";

export const metadata: Metadata = { title: "Registrar reclamo" };

export default function ClaimFormPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Registrar un reclamo</h1>
        <p className="mt-2 text-slate-600">
          Complete el formulario y recibirá un folio para dar seguimiento. Atenderemos su caso en un máximo de 5 días
          hábiles.
        </p>
      </header>
      <ClaimForm />
    </div>
  );
}
