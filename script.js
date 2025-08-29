// Dropdown card
const cards = document.querySelectorAll(".drop-down-card");

cards.forEach(card => {
  const plusIcon = card.querySelector(".plus-icon");
  const minusIcon = card.querySelector(".minus-icon");
  const content = card.querySelector(".drop-down-content");

  plusIcon.addEventListener("click", () => {
    content.style.display = "block";
    plusIcon.style.display = "none";
    minusIcon.style.display = "inline";
  });

  minusIcon.addEventListener("click", () => {
    content.style.display = "none";
    minusIcon.style.display = "none";
    plusIcon.style.display = "inline";
  });
});


// ClOSE MENU FOR MOBILE
const menuIcon = document.getElementById("hamburger");
const closeIcon = document.getElementById("close");
const mobileMenuShow = document.getElementById("mobileMenu");


menuIcon.addEventListener("click", () => {
  mobileMenu.style.display = "block";
})

closeIcon.addEventListener("click", () => {
  mobileMenu.style.display = "none";
})