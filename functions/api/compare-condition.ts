export async function onRequestPost(context: any) {
  const { request, env } = context;

  const GEMINI_API_KEY = env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: "AI service not configured" }), {
      status: 503, headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const body = await request.json();
    const { inspectionPhotoBase64, mimeType, originalPhotoUrl, artifactName, currentCondition } = body;

    const prompt = `You are a professional heritage conservator conducting a forensic condition assessment.

Artifact: ${artifactName}
Previously recorded condition: ${currentCondition}

Analyze the uploaded inspection photo and provide a detailed conservation report.

Return a JSON object:
{
  "condition": "one of: Mint, Good, Fair, Poor, Damaged",
  "notes": "detailed forensic observation notes comparing current state, noting any changes, deterioration, or improvements",
  "recommendations": "specific conservation action recommendations"
}`;

    const parts: any[] = [{ text: prompt }];
    if (inspectionPhotoBase64) {
      parts.push({ inline_data: { mime_type: mimeType || "image/jpeg", data: inspectionPhotoBase64 } });
    }

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts }] })
    });

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const clean = text.replace(/```json|```/g, "").trim();
    const result = JSON.parse(clean);

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
}
