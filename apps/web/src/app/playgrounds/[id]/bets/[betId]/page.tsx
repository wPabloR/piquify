import Link from "next/link";
import { joinBet, leaveBet, setBetResult, voteBetResult } from "@/app/playgrounds/actions";
import { fetchBet, fetchPlayground } from "@/lib/api";
import {
  betStatusLabel,
  formatDateTime,
  formatStake,
} from "@/lib/format";
import { getCurrentUser, requireAccessToken } from "@/lib/session";
import {
  primaryButtonClassName,
  secondaryButtonClassName,
} from "@/lib/ui";

type BetPageProps = {
  params: Promise<{ id: string; betId: string }>;
  searchParams: Promise<{ error?: string | string[] }>;
};

export default async function BetPage({ params, searchParams }: BetPageProps) {
  const { id, betId } = await params;
  const accessToken = await requireAccessToken(`/playgrounds/${id}/bets/${betId}`);
  const [user, playground, bet, query] = await Promise.all([
    getCurrentUser(),
    fetchPlayground(accessToken, id),
    fetchBet(accessToken, id, betId),
    searchParams,
  ]);
  const error = Array.isArray(query.error) ? query.error[0] : query.error;
  const isAdmin = !("error" in playground) && playground.role === "admin";

  if ("error" in bet) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-6 py-10">
        <Link
          className="text-sm text-zinc-500 underline-offset-4 hover:underline"
          href={`/playgrounds/${id}`}
        >
          Volver
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Pique
        </h1>
        <p className="text-sm text-red-600 dark:text-red-400">{bet.error}</p>
      </main>
    );
  }

  const myOption = bet.options.find((option) => option.id === bet.myOptionId);
  const canJoin = bet.status === "open" && !bet.myOptionId;
  const canLeave = bet.status === "open" && Boolean(bet.myOptionId);
  const enoughPoints = (user?.balance ?? 0) >= bet.stake;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-2">
        <Link
          className="text-sm text-zinc-500 underline-offset-4 hover:underline"
          href={`/playgrounds/${id}`}
        >
          Volver
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            {bet.title}
          </h1>
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {betStatusLabel(bet.status)}
          </span>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {formatStake(bet.stake)} · Cierra el {formatDateTime(bet.deadline)} ·{" "}
          {bet.participantCount === 1
            ? "1 participante"
            : `${bet.participantCount} participantes`}
        </p>
      </div>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Opciones
        </h2>
        <ul className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
          {bet.options.map((option) => {
            const won = bet.winningOptionId === option.id;
            const mine = bet.myOptionId === option.id;
            return (
              <li
                key={option.id}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <p className="font-medium text-zinc-950 dark:text-zinc-50">
                  {option.label}
                  {mine ? (
                    <span className="ml-2 text-sm font-normal text-zinc-500">
                      tu pick
                    </span>
                  ) : null}
                </p>
                {won ? (
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    {bet.status === "pending_result" ? "Propuesta" : "Ganadora"}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      {bet.status === "resolved" && bet.payout ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Reparto
          </h2>
          {bet.payout.winnerCount === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Nadie acertó. Se han devuelto {formatStake(bet.payout.refund)} a
              cada participante.
            </p>
          ) : (
            <>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Bote {formatStake(bet.payout.pot)}.{" "}
                {bet.payout.winnerCount === 1
                  ? `1 acertante se lleva ${formatStake(bet.payout.share)}.`
                  : `${bet.payout.winnerCount} acertantes reciben ${formatStake(bet.payout.share)} cada uno.`}
              </p>
              {bet.payout.residual > 0 ? (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {formatStake(bet.payout.residual)} quedan en el bote residual
                  de este grupo.
                </p>
              ) : null}
            </>
          )}
          {bet.payout.winnerCount === 0 && bet.myOptionId ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Se te han devuelto {formatStake(bet.payout.refund)}.
            </p>
          ) : bet.myOptionId && bet.myOptionId === bet.winningOptionId ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Has ganado {formatStake(bet.payout.share)}.
            </p>
          ) : bet.myOptionId ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No has acertado.
            </p>
          ) : null}
        </section>
      ) : null}

      {canJoin ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Participar
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Entrar cuesta {formatStake(bet.stake)}. Tienes{" "}
            {formatStake(user?.balance ?? 0)}.
          </p>
          {enoughPoints ? (
            <form action={joinBet} className="flex flex-col gap-4">
              <input type="hidden" name="playgroundId" value={id} />
              <input type="hidden" name="betId" value={betId} />
              <ul className="flex flex-col gap-2">
                {bet.options.map((option) => (
                  <li key={option.id}>
                    <label className="flex items-center gap-3 text-sm text-zinc-950 dark:text-zinc-50">
                      <input
                        type="radio"
                        name="optionId"
                        value={option.id}
                        required
                      />
                      {option.label}
                    </label>
                  </li>
                ))}
              </ul>
              <button className={primaryButtonClassName} type="submit">
                Entrar al pique
              </button>
            </form>
          ) : (
            <p className="text-sm text-red-600 dark:text-red-400">
              No tienes suficientes puntos para este pique.
            </p>
          )}
        </section>
      ) : null}

      {canLeave ? (
        <section className="flex flex-col gap-3">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Estás dentro con {myOption?.label ?? "tu opción"}. Mientras el pique
            esté abierto puedes salir y recuperar {formatStake(bet.stake)}.
          </p>
          <form action={leaveBet}>
            <input type="hidden" name="playgroundId" value={id} />
            <input type="hidden" name="betId" value={betId} />
            <button className={secondaryButtonClassName} type="submit">
              Salir del pique
            </button>
          </form>
        </section>
      ) : null}

      {isAdmin && bet.status === "locked" ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Resultado
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            El plazo ha cerrado. Propón la opción ganadora. Los participantes
            tendrán 48 horas para validarla; el silencio cuenta a favor.
          </p>
          <form action={setBetResult} className="flex flex-col gap-4">
            <input type="hidden" name="playgroundId" value={id} />
            <input type="hidden" name="betId" value={betId} />
            <ul className="flex flex-col gap-2">
              {bet.options.map((option) => (
                <li key={option.id}>
                  <label className="flex items-center gap-3 text-sm text-zinc-950 dark:text-zinc-50">
                    <input
                      type="radio"
                      name="optionId"
                      value={option.id}
                      required
                    />
                    {option.label}
                  </label>
                </li>
              ))}
            </ul>
            <button className={primaryButtonClassName} type="submit">
              Proponer resultado
            </button>
          </form>
        </section>
      ) : null}

      {bet.status === "pending_result" ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Validación
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {bet.confirmedCount} a favor · {bet.rejectedCount} en contra ·{" "}
            {bet.pendingVoteCount === 1
              ? "1 pendiente"
              : `${bet.pendingVoteCount} pendientes`}
            {bet.voteClosesAt
              ? ` · Cierra el ${formatDateTime(bet.voteClosesAt)}`
              : null}
          </p>
          {bet.myOptionId && !bet.myVote ? (
            <div className="flex flex-col gap-6">
              <form action={voteBetResult}>
                <input type="hidden" name="playgroundId" value={id} />
                <input type="hidden" name="betId" value={betId} />
                <input type="hidden" name="choice" value="confirm" />
                <button className={primaryButtonClassName} type="submit">
                  Confirmar resultado
                </button>
              </form>
              <form action={voteBetResult} className="flex flex-col gap-4">
                <input type="hidden" name="playgroundId" value={id} />
                <input type="hidden" name="betId" value={betId} />
                <input type="hidden" name="choice" value="reject" />
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Si no estás de acuerdo, sugiere otra opción ganadora.
                </p>
                <ul className="flex flex-col gap-2">
                  {bet.options
                    .filter((option) => option.id !== bet.winningOptionId)
                    .map((option) => (
                      <li key={option.id}>
                        <label className="flex items-center gap-3 text-sm text-zinc-950 dark:text-zinc-50">
                          <input
                            type="radio"
                            name="suggestedOptionId"
                            value={option.id}
                            required
                          />
                          {option.label}
                        </label>
                      </li>
                    ))}
                </ul>
                <button className={secondaryButtonClassName} type="submit">
                  Rechazar y sugerir
                </button>
              </form>
            </div>
          ) : bet.myVote === "confirm" ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Has confirmado el resultado propuesto.
            </p>
          ) : bet.myVote === "reject" ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Has rechazado el resultado propuesto.
            </p>
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Esperando a que los participantes validen el resultado.
            </p>
          )}
        </section>
      ) : null}

      {isAdmin && bet.status === "open" ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Podrás proponer el resultado cuando cierre el plazo.
        </p>
      ) : null}
    </main>
  );
}
