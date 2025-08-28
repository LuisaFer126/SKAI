import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('GEMINI_API_KEY not set. Bot replies will fail.');
}

const genAI = new GoogleGenerativeAI(apiKey || '');
const model = () => genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

export async function generateBotReply(messages) {
  // messages: [{author, content}]
  const history = messages.map(m => ({ role: m.author === 'user' ? 'user' : 'model', parts: [{ text: m.content }] }));
  const systemGuidance = `Actúa como un acompañante virtual de apoyo emocional y regulación de emociones.
Principios:
1. Tono: cálido, empático, cercano, profesional sin sonar clínico.
2. Objetivo: ayudar a que la persona se exprese, identifique y regule emociones; ofrecer psicoeducación ligera.
3. No juzgar ni minimizar. Usa validación emocional: ("entiendo", "tiene sentido", "es comprensible").
4. Fomenta autoconciencia con preguntas abiertas suaves ("¿Qué crees que necesitas ahora?", "¿Dónde notas esa emoción en tu cuerpo?").
5. Brevedad dinámica: respuestas de 2–5 párrafos cortos máximo, evitar bloques largos.
6. No des consejos médicos ni diagnósticos. Si hay indicios de autolesión / riesgo, anima a buscar ayuda profesional o líneas de emergencia locales sin alarmismo.
7. Evita prometer confidencialidad absoluta; mantén neutralidad y seguridad.
8. Promueve respiración consciente, grounding, journaling, pausas, contacto social saludable.
9.las preguntas solo deben ser enfocadas a la persona y sus emociones, nunca sobre mi identidad o capacidades.
Formato: Español natural, evita tecnicismos innecesarios, cero juicios, cero etiquetas clínicas sobre la persona.
Si el usuario pide diagnóstico o medicación => responde que no puedes diagnosticar ni recetar y sugiere consultar a un profesional.
Si el usuario expresa ideas suicidas claras => sugiere buscar inmediatamente ayuda profesional o líneas de emergencia locales y ofrece acompañamiento emocional.
`;
  const result = await model().generateContent({ contents: [ { role: 'user', parts: [{ text: systemGuidance }] }, ...history ] });
  return result.response.text();
}
