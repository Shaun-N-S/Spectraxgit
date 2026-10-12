function getNameFromGooglePayload(payload = {}) {
  const givenName = (payload.given_name || "").trim();
  const familyName = (payload.family_name || "").trim();
  const nameParts = (payload.name || "").trim().split(/\s+/).filter(Boolean);

  if (givenName) {
    return { firstName: givenName, lastName: familyName };
  }

  return {
    firstName: nameParts[0] || "",
    lastName: familyName || nameParts.slice(1).join(" "),
  };
}

module.exports = { getNameFromGooglePayload };
