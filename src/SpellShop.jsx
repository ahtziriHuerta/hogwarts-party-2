import { useEffect, useRef, useState } from "react";
import BoardIcon from "./BoardIcon";
import "./Spells.css";

export default function SpellShop({
  player,
  catalog,
  trophyPrice,
  trophiesToWin,
  onBuy,
  onClose,
}) {
  const dialog = useRef(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const inventory = player.inventory ?? [];
  useEffect(() => {
    dialog.current.showModal();
  }, []);

  function close() {
    dialog.current.close();
    onClose();
  }

  function buy(id) {
    if (busy) return;
    setBusy(true);
    setFeedback("");
    onBuy(id, (result) => {
      setBusy(false);
      setFeedback(
        result?.ok
          ? id === "shield"
            ? "Escudo guardado: pulsa «Usar escudo» en un duelo, antes de responder."
            : id === "hint"
              ? "Pista guardada: pulsa «Usar pista» en una pregunta de cuatro opciones."
              : "Trofeo sumado. Cuenta automáticamente para ganar."
          : result?.error || "Intenta de nuevo.",
      );
    });
  }

  return (
    <dialog
      ref={dialog}
      className="spell-shop-modal"
      aria-labelledby="shop-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <header className="spell-shop-header">
        <h2 id="shop-title">Tienda mágica</h2>
        <button
          type="button"
          className="secondary"
          onClick={close}
          aria-label="Cerrar tienda"
        >
          ✕
        </button>
      </header>
      <p className="spell-wallet">
        🪙 {player.points} monedas · 🏆 {player.trophies}/{trophiesToWin}
      </p>
      <div className="spell-inventory" role="list" aria-label="Tu inventario">
        {Array.from({ length: catalog.inventoryLimit }, (_, index) => {
          const item = catalog.items.find(
            (entry) => entry.id === inventory[index],
          );
          return (
            <span key={index} role="listitem">
              {item ? (
                <>
                  <BoardIcon type={item.id} /> {item.name}
                </>
              ) : (
                "Espacio libre"
              )}
            </span>
          );
        })}
      </div>
      <div className="spell-shop-cards">
        {catalog.items.map((item) => (
          <article key={item.id} className="spell-shop-card">
            <h3>
              <BoardIcon type={item.id} />
              {item.name}
            </h3>
            <p>{item.description}</p>
            <button
              type="button"
              className="primary"
              disabled={
                busy ||
                inventory.length >= catalog.inventoryLimit ||
                player.points < item.cost
              }
              onClick={() => buy(item.id)}
              aria-label={`Comprar ${item.name} por ${item.cost} monedas`}
            >
              Comprar · {item.cost} 🪙
            </button>
          </article>
        ))}
        <article className="spell-shop-card shop-trophy-card">
          <h3>
            <BoardIcon type="trophy" />
            Trofeo
          </h3>
          <p>
            Consigue {trophiesToWin} para ganar. Los trofeos no ocupan
            inventario.
          </p>
          <button
            type="button"
            className="primary"
            disabled={
              busy ||
              player.points < trophyPrice ||
              player.trophies >= trophiesToWin
            }
            onClick={() => buy("trophy")}
            aria-label={`Comprar trofeo por ${trophyPrice} monedas`}
          >
            Comprar · {trophyPrice} 🪙
          </button>
        </article>
      </div>
      <p className="spell-shop-feedback" role="status">
        {busy
          ? "Comprando…"
          : feedback ||
            (inventory.length
              ? "Tus hechizos se activan durante las preguntas, antes de responder."
              : "Compra entre retos · Usa un hechizo por reto, antes de responder.")}
      </p>
    </dialog>
  );
}
