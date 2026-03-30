export async function POST(request) {
  try {
    const { license_key } = await request.json();

    if (!license_key || !license_key.trim()) {
      return Response.json({ valid: false, error: "No license key provided." }, { status: 400 });
    }

    const res = await fetch("https://api.lemonsqueezy.com/v1/licenses/validate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
      },
      body: JSON.stringify({
        license_key: license_key.trim(),
      }),
    });

    const data = await res.json();

    if (data.valid || data.license_key?.status === "active") {
      return Response.json({ valid: true });
    } else {
      return Response.json({
        valid: false,
        error: data.error || "Invalid or expired license key.",
      });
    }
  } catch (err) {
    return Response.json({ valid: false, error: "Validation failed. Please try again." }, { status: 500 });
  }
}
