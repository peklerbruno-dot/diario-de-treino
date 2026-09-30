"use client";

import { aceitarConvite } from "@/app/acoes-publicas";
import { Formulario } from "@/componentes/formulario";
import { CamposDeConta } from "@/componentes/campos-de-conta";

export function FormularioDeConvite({
  convite,
  livres,
  logado,
}: {
  convite: string;
  livres: { id: string; nome: string }[];
  logado: string | null;
}) {
  return (
    <Formulario acao={aceitarConvite} botao={logado ? `Entrar na viagem como ${logado.split(" ")[0]}` : "Criar conta e entrar"}>
      {(e) => (
        <>
          <input type="hidden" name="convite" value={convite} />
          {livres.length > 0 && (
            <fieldset>
              <legend className="rotulo">Você já está na lista?</legend>
              <p className="mb-2 text-[14px] text-fosco">Se alguém já te colocou nas contas, escolha seu nome e tudo que estava nele passa a ser seu.</p>
              <div className="space-y-1.5">
                {livres.map((m) => (
                  <label key={m.id} className="flex items-center gap-3 rounded-folha border border-regua px-3 py-2.5">
                    <input type="radio" name="membro" value={m.id} defaultChecked={e?.valores?.membro === m.id} className="h-5 w-5 accent-[var(--realce)]" />
                    <span>Sou {m.nome}</span>
                  </label>
                ))}
                <label className="flex items-center gap-3 rounded-folha border border-regua px-3 py-2.5">
                  <input type="radio" name="membro" value="novo" defaultChecked={!e?.valores?.membro || e.valores.membro === "novo"} className="h-5 w-5 accent-[var(--realce)]" />
                  <span>Não estou na lista</span>
                </label>
              </div>
            </fieldset>
          )}
          {!logado && <CamposDeConta estado={e} />}
        </>
      )}
    </Formulario>
  );
}
