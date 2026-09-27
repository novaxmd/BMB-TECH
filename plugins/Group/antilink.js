const { bmbtz } = require("../../devbmb/bmbtz");
const {
  ajouterOuMettreAJourJid, verifierEtatJid,
  setRemoveMode, getRemoveMode,
  setWarnMode, getWarnMode,
} = require("../../lib/antilien");

/**
 * antilink
 *
 * New syntax — three independent toggles instead of one mode:
 *   .antilink on / off            — master: delete detected links
 *   .antilink remove on / off     — also kick immediately when caught
 *   .antilink warn on / off       — also warn (kicks at the group's
 *                                   warn limit) when caught
 *
 * Example combos:
 *   antilink=on, remove=off, warn=off  -> link just gets deleted
 *   antilink=on, remove=on             -> link deleted + sender kicked
 *   antilink=on, warn=on               -> link deleted + sender warned
 */
bmbtz({ nomCom: "antilink", alias: ["antilinks"], categorie: 'Group', reaction: "🔗" }, async (dest, client, commandeOptions) => {
  var { repondre, arg, verifGroupe, superUser, verifAdmin } = commandeOptions;

  if (!verifGroupe) return repondre("🚫 *This command works in groups only.*");

  if (!(superUser || verifAdmin)) {
    return repondre("🚫 *Only group admins or super users can use this command.*");
  }

  try {
    const sub = (arg && arg[0] || '').toLowerCase();

    // .antilink remove on/off
    if (sub === 'remove') {
      const val = (arg[1] || '').toLowerCase();
      if (val !== 'on' && val !== 'off') {
        const current = await getRemoveMode(dest);
        return repondre(
`╭───❰ *ANTILINK · REMOVE* ❱───╮
│ Status: ${current ? 'ON ✅' : 'OFF ❌'}
│
│ ⚙️ antilink remove on
│ ⚙️ antilink remove off
│
│ When ON, the sender is kicked
│ immediately after their link is
│ deleted.
╰────────────────────────────╯`
        );
      }
      await setRemoveMode(dest, val === 'on');
      return repondre(
`╭───❰ *ANTILINK · REMOVE* ❱───╮
│ 🔧 Remove-on-catch: *${val.toUpperCase()}*
╰────────────────────────────╯`
      );
    }

    // .antilink warn on/off
    if (sub === 'warn') {
      const val = (arg[1] || '').toLowerCase();
      if (val !== 'on' && val !== 'off') {
        const current = await getWarnMode(dest);
        return repondre(
`╭───❰ *ANTILINK · WARN* ❱───╮
│ Status: ${current ? 'ON ✅' : 'OFF ❌'}
│
│ ⚙️ antilink warn on
│ ⚙️ antilink warn off
│
│ When ON, the sender is warned;
│ hitting the group's warn limit
│ (see .setwarnlimit) kicks them.
╰──────────────────────────╯`
        );
      }
      await setWarnMode(dest, val === 'on');
      return repondre(
`╭───❰ *ANTILINK · WARN* ❱───╮
│ 🔧 Warn-on-catch: *${val.toUpperCase()}*
╰──────────────────────────╯`
      );
    }

    // .antilink on / off / (no args = status)
    if (sub === 'on' || sub === 'off') {
      await ajouterOuMettreAJourJid(dest, sub === 'on' ? 'oui' : 'non');
      return repondre(
`╭───❰ *ANTILINK STATUS* ❱───╮
│ ${sub === 'on' ? '✅ Antilink has been *activated*' : '❌ Antilink has been *deactivated*'}
╰──────────────────────────╯`
      );
    }

    const masterOn = await verifierEtatJid(dest);
    const removeOn = await getRemoveMode(dest);
    const warnOn = await getWarnMode(dest);

    return repondre(
`╭───❰ *ANTILINK HELP MENU* ❱───╮
│
│ Delete links : ${masterOn ? 'ON ✅' : 'OFF ❌'}
│ Also remove  : ${removeOn ? 'ON ✅' : 'OFF ❌'}
│ Also warn    : ${warnOn ? 'ON ✅' : 'OFF ❌'}
│
│ ⚙️ antilink on / antilink off
│ ⚙️ antilink remove on / off
│ ⚙️ antilink warn on / off
│
│ These combine — e.g. turn on
│ antilink + remove for an
│ instant-kick antilink.
╰────────────────────────────╯`
    );

  } catch (error) {
    repondre("❌ *Error:* " + (error.message || error));
  }
});
