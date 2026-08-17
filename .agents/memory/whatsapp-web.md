---
name: WhatsApp web
description: Límite de los enlaces wa.me y configuración de números.
---

Un enlace `wa.me` puede seleccionar el número destinatario y precargar el texto, pero no puede cambiar la cuenta de WhatsApp desde la que se envía. El remitente real es la sesión abierta en WhatsApp Web o el dispositivo.

**Why:** WhatsApp no expone el número remitente como parámetro de URL; prometer ese cambio produciría una configuración engañosa.

**How to apply:** Permitir configurar destinatario y, si se necesita, añadir el número del negocio dentro del texto como referencia. Para enviar realmente desde varias cuentas se requiere cambiar de sesión o usar una API oficial de WhatsApp.