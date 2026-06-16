# Beta QA - Comunidad Invitable

Dominio de prueba: https://biblioteca-de-prompts-ashen.vercel.app

## Objetivo

Validar que una persona nueva pueda entrar con Google, entender el loop principal y dejar feedback sin ayuda externa.

## Cuentas

| Tester | Cuenta Google | Dispositivo | Navegador/origen | Completo | Friccion principal |
| --- | --- | --- | --- | --- | --- |
| Tester 1 |  |  |  | Pendiente |  |
| Tester 2 |  |  |  | Pendiente |  |
| Tester 3 |  |  |  | Pendiente |  |
| Tester 4 |  |  |  | Opcional |  |
| Tester 5 |  |  |  | Opcional |  |

## Mensaje Para Copiar

```text
Estoy probando una beta privada de Biblioteca de Prompts.

Es una red social + radar para guardar prompts, remixear recursos publicos, convertir tendencias en ideas y compartir briefings.
Me ayudas probandola desde celular? Deberia tomarte 5-8 minutos.

Checklist rapido:
1. Entra con Google.
2. Elige un pack pequeno de prompts.
3. Guarda un prompt publico como remix privado.
4. Abre Noticias y guarda una idea.
5. Dejame feedback en el Foro con una captura si ves algo raro.

Importante: nada se publica sin que tu lo decidas.

https://biblioteca-de-prompts-ashen.vercel.app
```

## Criterio De Exito

- [ ] 3 testers entran con Google.
- [ ] 3 testers eligen un pack inicial.
- [ ] 3 testers guardan al menos un remix privado.
- [ ] 2 testers crean una idea desde Noticias.
- [ ] 2 testers publican feedback en Foro.
- [ ] 0 testers reportan que contenido privado aparece publico.

## Checklist Por Tester

- [ ] Abre el link desde Chrome o Safari.
- [ ] Abre el link desde WhatsApp o Instagram.
- [ ] Inicia sesion con Google.
- [ ] Confirma que entra a Mi Biblioteca despues del login.
- [ ] Elige un pack inicial pequeno.
- [ ] Explora prompts publicos.
- [ ] Guarda un prompt como remix privado.
- [ ] Usa o copia un prompt.
- [ ] Abre Noticias y guarda una idea.
- [ ] Crea un post de feedback en Foro.
- [ ] Abre su perfil publico.
- [ ] Confirma que no ve contenido privado publicado automaticamente.

## Checklist De Privacidad Manual

- [ ] Un prompt privado no aparece en Comunidad.
- [ ] Un prompt privado no aparece en perfil publico.
- [ ] Una carpeta compartida no muestra prompts privados por defecto.
- [ ] Una idea guardada en Noticias no es visible para otro usuario.
- [ ] Eventos de uso/recomendacion no son visibles para otro usuario.
- [ ] Un briefing borrador no abre para visitantes.
- [ ] Un briefing publicado abre sin login.
- [ ] Un reporte de prompt solo lo ve el dueno del prompt o founder.
- [ ] Un usuario no puede editar/borrar posts de otro usuario.
- [ ] Un usuario no puede editar/borrar hackathons de otro usuario.

## Preguntas De Feedback

- Que fue lo mas claro?
- Que fue lo mas confuso?
- En que paso te detuviste?
- Lo probaste desde celular? Cual navegador?
- Hubo scroll horizontal, texto invisible o botones apretados?
- Guardarias prompts reales aqui?
- Compartirias tu perfil publico?

## Registro De Fricciones

| Fecha | Tester | Paso | Friccion | Severidad | Accion |
| --- | --- | --- | --- | --- | --- |
|  |  | Login |  | Alta/Media/Baja |  |
|  |  | Pack inicial |  | Alta/Media/Baja |  |
|  |  | Guardar remix |  | Alta/Media/Baja |  |
|  |  | Foro/Feedback |  | Alta/Media/Baja |  |
|  |  | Movil/UI |  | Alta/Media/Baja |  |

## Resultado

- Estado: pendiente
- Bloqueadores:
- Fricciones menores:
- Siguiente correccion:

## Prioridad De Correccion

1. Login Google o redirect movil.
2. Permisos Firestore o fuga de contenido privado.
3. Guardar remix o cargar pack inicial.
4. Overflow/responsive en celular.
5. Copy confuso o CTA poco visible.
