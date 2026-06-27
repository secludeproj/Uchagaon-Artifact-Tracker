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
    const { imageBase64, mimeType } = body;

    const prompt = `You are an expert heritage artifact assessor for a palace museum. Analyze this image and provide detailed information about the artifact.

Return a JSON object with these exact fields:
{
  "name": "artifact name",
  "category": "one of: Weaponry & Armor, Artwork & Paintings, Furniture, Textiles & Carpets, Ceramics & Pottery, Metalwork, Religious & Ceremonial, Manuscripts & Books, Jewelry & Ornaments, Other",
  "description": "detailed description",
  "estimatedAge": "estimated age/period",
  "material": "materials used",
  "condition": "one of: Mint, Good, Fair, Poor, Damaged",
  "handlingNotes": "conservation handling instructions",
  "conservationNotes": "conservation assessment",
  "story": "cultural/historical story about this artifact"
}`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType || "image/jpeg", data: imageBase64 } }
          ]
        }]
      })
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
