const revealItems = document.querySelectorAll("[data-reveal]");
const worldStage = document.getElementById("worldStage");
const contactForm = document.getElementById("contactForm");
const formStatus = document.getElementById("formStatus");
const formEndpoint = window.SITE_CONFIG?.formEndpoint || "";
const fallbackEmail = window.SITE_CONFIG?.fallbackEmail || "contact@example.com";
const rootStyle = document.documentElement.style;

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.16 });

revealItems.forEach((item) => observer.observe(item));

if (worldStage) {
  window.addEventListener("pointermove", (event) => {
    const xRatio = (event.clientX / window.innerWidth) - 0.5;
    const yRatio = (event.clientY / window.innerHeight) - 0.5;

    rootStyle.setProperty("--spot-x", `${event.clientX}px`);
    rootStyle.setProperty("--spot-y", `${event.clientY}px`);
    rootStyle.setProperty("--mouse-x", `${xRatio * 12}deg`);
    rootStyle.setProperty("--mouse-y", `${yRatio * -12}deg`);
  });

  document.addEventListener("scroll", () => {
    const scrollRatio = Math.min(window.scrollY / 1200, 1);
    rootStyle.setProperty("--scroll-globe", `${scrollRatio * 18}deg`);
  }, { passive: true });
}

if (contactForm) {
  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(contactForm);
    const payload = Object.fromEntries(formData.entries());

    if (!formEndpoint) {
      const subject = encodeURIComponent(`Pentest-Anfrage von ${payload.company}`);
      const body = encodeURIComponent(
        [
          `Unternehmen: ${payload.company}`,
          `Ansprechpartner: ${payload.name}`,
          `E-Mail: ${payload.email}`,
          `Service: ${payload.service}`,
          "",
          "Projektbeschreibung:",
          payload.message
        ].join("\n")
      );

      formStatus.textContent = "Kein Endpoint gesetzt. Es wird dein Mailprogramm geoeffnet.";
      window.location.href = `mailto:${fallbackEmail}?subject=${subject}&body=${body}`;
      return;
    }

    formStatus.textContent = "Anfrage wird sicher uebertragen...";

    try {
      const response = await fetch(formEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      contactForm.reset();
      formStatus.textContent = "Danke. Ihre Anfrage wurde erfolgreich uebermittelt.";
    } catch (error) {
      formStatus.textContent = "Die Anfrage konnte gerade nicht gesendet werden. Bitte Endpoint oder Netzwerk pruefen.";
    }
  });
}
