const revealItems = document.querySelectorAll("[data-reveal]");
const voidStage = document.getElementById("voidStage");
const canvas = document.getElementById("dataFlowCanvas");
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

if (voidStage && canvas) {
  const context = canvas.getContext("2d");
  const pointer = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    active: false
  };

  const particles = [];
  const particleCount = 120;

  const resizeCanvas = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };

  const createParticle = () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    baseX: Math.random() * canvas.width,
    baseY: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
    size: Math.random() * 2.2 + 0.8,
    alpha: Math.random() * 0.4 + 0.25
  });

  const fillParticles = () => {
    particles.length = 0;
    for (let index = 0; index < particleCount; index += 1) {
      particles.push(createParticle());
    }
  };

  const drawConnections = () => {
    for (let i = 0; i < particles.length; i += 1) {
      for (let j = i + 1; j < particles.length; j += 1) {
        const a = particles[i];
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distance = Math.hypot(dx, dy);

        if (distance < 130) {
          context.strokeStyle = `rgba(114, 240, 255, ${0.12 - distance / 1500})`;
          context.lineWidth = 1;
          context.beginPath();
          context.moveTo(a.x, a.y);
          context.lineTo(b.x, b.y);
          context.stroke();
        }
      }
    }
  };

  const animateCanvas = () => {
    context.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((particle) => {
      const dx = particle.x - pointer.x;
      const dy = particle.y - pointer.y;
      const distance = Math.hypot(dx, dy) || 1;

      if (pointer.active && distance < 180) {
        const force = (180 - distance) / 180;
        const angle = Math.atan2(dy, dx);
        particle.vx += Math.cos(angle) * force * 0.7;
        particle.vy += Math.sin(angle) * force * 0.7;
      }

      particle.vx += (particle.baseX - particle.x) * 0.0008;
      particle.vy += (particle.baseY - particle.y) * 0.0008;
      particle.vx *= 0.95;
      particle.vy *= 0.95;
      particle.x += particle.vx;
      particle.y += particle.vy;

      context.beginPath();
      context.fillStyle = `rgba(114, 240, 255, ${particle.alpha})`;
      context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      context.fill();
    });

    drawConnections();
    requestAnimationFrame(animateCanvas);
  };

  let targetX = 0;
  let targetY = 0;
  let smoothX = 0;
  let smoothY = 0;

  const animateScene = () => {
    smoothX += (targetX - smoothX) * 0.08;
    smoothY += (targetY - smoothY) * 0.08;

    rootStyle.setProperty("--mouse-x", `${smoothX * 16}deg`);
    rootStyle.setProperty("--mouse-y", `${smoothY * -16}deg`);

    requestAnimationFrame(animateScene);
  };

  resizeCanvas();
  fillParticles();
  animateCanvas();
  animateScene();

  window.addEventListener("resize", () => {
    resizeCanvas();
    fillParticles();
  });

  window.addEventListener("pointermove", (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;

    targetX = (event.clientX / window.innerWidth) - 0.5;
    targetY = (event.clientY / window.innerHeight) - 0.5;

    rootStyle.setProperty("--spot-x", `${event.clientX}px`);
    rootStyle.setProperty("--spot-y", `${event.clientY}px`);
  });

  window.addEventListener("pointerleave", () => {
    pointer.active = false;
  });

  document.addEventListener("scroll", () => {
    const scrollRatio = Math.min(window.scrollY / 1500, 1);
    rootStyle.setProperty("--scroll-depth", `${scrollRatio * 24}deg`);
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
