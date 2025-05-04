/**
 * Gradient Blur Effect
 * Blue and Grey blurred circles on white background
 */

document.addEventListener('DOMContentLoaded', () => {
  // Get canvas element
  const canvas = document.getElementById('gradient-canvas');
  
  if (!canvas) {
    console.error('Gradient canvas element not found');
    return;
  }
  
  const ctx = canvas.getContext('2d');
  
  // Set canvas dimensions to match window size
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  
  // Initial sizing
  resizeCanvas();
  
  // Resize canvas when window size changes
  window.addEventListener('resize', () => {
    resizeCanvas();
    createCircles(); // Recreate circles when resizing
  });
  
  // Blue and grey color palette
  const colors = [
    { r: 66, g: 135, b: 245 },    // Primary blue
    { r: 97, g: 166, b: 247 },    // Light blue
    { r: 41, g: 98, b: 255 },     // Deep blue
    { r: 114, g: 137, b: 218 },   // Periwinkle blue
    { r: 100, g: 116, b: 139 },   // Slate grey
    { r: 148, g: 163, b: 184 },   // Light grey
    { r: 71, g: 85, b: 105 }      // Dark grey
  ];
  
  // Circle objects
  let circles = [];
  
  // Create circles
  function createCircles() {
    circles = [];
    
    // Create 12 circles of various sizes
    for (let i = 0; i < 12; i++) {
      // Random color from our palette
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      circles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 200 + 100,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        color: color,
        opacity: Math.random() * 0.2 + 0.1  // Semi-transparent
      });
    }
  }
  
  // Create initial circles
  createCircles();
  
  // Animation function
  function animate() {
    // Clear canvas with white background (with slight transparency to create trail effect)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Apply global blur
    ctx.filter = 'blur(40px)';
    
    // Draw each circle
    circles.forEach(circle => {
      // Update position
      circle.x += circle.speedX;
      circle.y += circle.speedY;
      
      // Wrap around edges instead of bouncing
      if (circle.x < -circle.radius * 2) circle.x = canvas.width + circle.radius;
      if (circle.x > canvas.width + circle.radius * 2) circle.x = -circle.radius;
      if (circle.y < -circle.radius * 2) circle.y = canvas.height + circle.radius;
      if (circle.y > canvas.height + circle.radius * 2) circle.y = -circle.radius;
      
      // Draw circle with gradient
      const gradient = ctx.createRadialGradient(
        circle.x, circle.y, 0,
        circle.x, circle.y, circle.radius
      );
      
      // Create gradient from center to edge
      gradient.addColorStop(0, `rgba(${circle.color.r}, ${circle.color.g}, ${circle.color.b}, ${circle.opacity})`);
      gradient.addColorStop(1, `rgba(${circle.color.r}, ${circle.color.g}, ${circle.color.b}, 0)`);
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // Reset filters
    ctx.filter = 'none';
    
    // Continue animation
    requestAnimationFrame(animate);
  }
  
  // Start animation
  animate();
});