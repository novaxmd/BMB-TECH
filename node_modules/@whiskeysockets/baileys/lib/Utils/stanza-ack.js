export function buildAckStanza(node, errorCode, meId) {
    const { tag, attrs } = node;
    const stanza = {
        tag: 'ack',
        attrs: {
            id: attrs.id,
            to: attrs.from,
            class: tag
        }
    };
    if (errorCode) {
        stanza.attrs.error = errorCode.toString();
    }
    if (attrs.participant) {
        stanza.attrs.participant = attrs.participant;
    }
    if (attrs.recipient) {
        stanza.attrs.recipient = attrs.recipient;
    }
    if (attrs.type) {
        stanza.attrs.type = attrs.type;
    }
    if (tag === 'message' && meId) {
        stanza.attrs.from = meId;
    }
    return stanza;
}
//# sourceMappingURL=stanza-ack.js.map