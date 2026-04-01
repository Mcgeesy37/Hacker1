const scene = document.getElementById("scene");
const revealItems = document.querySelectorAll("[data-reveal]");
const contactForm = document.getElementById("contactForm");
const formStatus = document.getElementById("formStatus");
const formEndpoint = window.SITE_CONFIG?.formEndpoint || "";
const fallbackEmail = window.SITE_CONFIG?.fallbackEmail || "contact@example.com";
const rootStyle = document.documentElement.style;

if (scene) {
  window.addEventListener("pointermove", (event) => {
    const { innerWidth, innerHeight } = window;
    const rotateY = ((event.clientX / innerWidth) - 0.5) * 18;
    const rotateX = ((event.clientY / innerHeight) - 0.5) * -14;

    scene.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    rootStyle.setProperty("--spotlight-x", `${event.clientX}px`);
    rootStyle.setProperty("--spotlight-y", `${event.clientY}px`);
  });

  window.addEventListener("mouseleave", () => {
    scene.style.transform = "rotateX(0deg) rotateY(0deg)";
    rootStyle.setProperty("--spotlight-x", "50%");
    rootStyle.setProperty("--spotlight-y", "22%");
  });
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.18 });

revealItems.forEach((item) => observer.observe(item));

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

      formStatus.textContent = "Kein Formular-Endpoint gesetzt. Es wird dein Mailprogramm geöffnet.";
      window.location.href = `mailto:${fallbackEmail}?subject=${subject}&body=${body}`;
      return;
    }

    formStatus.textContent = "Anfrage wird sicher übertragen...";

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
      formStatus.textContent = "Danke. Ihre Anfrage wurde erfolgreich übermittelt.";
    } catch (error) {
      formStatus.textContent = "Die Anfrage konnte gerade nicht gesendet werden. Bitte Endpoint oder Netzwerk prüfen.";
    }
  });
}
