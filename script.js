// Dropdown effect
// const plusIcon = document.getElementById("plus");
// const minusIcon = document.getElementById("minus")
// const cardContent = document.getElementById("content")

// // Onclick of the icon show content
// plusIcon.addEventListener("click", () => {
//   cardContent.style.display = "flex";
//   plusIcon.style.display = "none";
//   minusIcon.style.display = "flex";
// })
  
// // Hide content
// minusIcon.addEventListener("click", () => {
//   cardContent.style.display = "none";
//   minusIcon.style.display = "none";
//   plusIcon.style.display = "flex";  
// })


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
