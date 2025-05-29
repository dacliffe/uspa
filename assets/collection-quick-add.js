// Make setupQuickAdd globally available
window.setupQuickAdd = function () {
  // Initialize CartManager first if it doesn't exist
  if (!window.cartManager) {
    window.cartManager = new CartManager();
  }

  // Remove existing global click handler
  document.removeEventListener('click', handleGlobalClick);

  document.querySelectorAll('.product-card-wrapper:not(.quick-add-initialized)').forEach((wrapper, index) => {
    wrapper.classList.add('quick-add-initialized');
    let timeoutId;
    let selectedVariantId = null;
    let isAddingToCart = false;

    const quickAddContainer = wrapper.querySelector('.quick-add-container');
    const variantButtons = wrapper.querySelectorAll('.add-to-cart-button');
    const submitContainer = wrapper.querySelector('.quick-add-submit-container');
    const submitButton = wrapper.querySelector('.quick-add-submit');
    const mobileCartIcon = wrapper.querySelector('.mobile-cart-icon');

    // Initially ensure submit button is disabled
    if (submitButton) {
      submitButton.disabled = true;
    }

    // Mobile behavior (toggle on icon click)
    if (mobileCartIcon) {
      mobileCartIcon.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        if (!quickAddContainer) return;

        // Close other quick add containers
        document.querySelectorAll('.quick-add-container.open').forEach((container) => {
          if (container !== quickAddContainer) {
            container.classList.remove('open');
            // Hide the submit button container for other closing quick adds
            const otherSubmitContainer = container.querySelector('.quick-add-submit-container');
            if (otherSubmitContainer) {
              otherSubmitContainer.classList.remove('visible');
            }
          }
        });

        if (quickAddContainer.classList.contains('open')) {
          quickAddContainer.classList.remove('open');
          // Only hide fully if no variant selected
          if (selectedVariantId === null) {
            setTimeout(() => {
              quickAddContainer.classList.add('hidden');
              // Hide the submit button container if quick add closes and no variant is selected
              if (submitContainer) {
                submitContainer.classList.remove('visible');
              }
            }, 100);
          }
        } else {
          quickAddContainer.classList.remove('hidden');
          requestAnimationFrame(() => {
            quickAddContainer.classList.add('open');
            // Show the submit button container when quick add opens
            if (submitContainer) {
              submitContainer.classList.add('visible');
            }
          });
        }
      });
    }

    // Desktop hover behavior
    if (window.innerWidth > 990) {
      wrapper.addEventListener('mouseover', function (e) {
        if (quickAddContainer) {
          clearTimeout(timeoutId);
          quickAddContainer.classList.remove('hidden');
          quickAddContainer.classList.add('open');
          // Show the submit button container when quick add opens
          if (submitContainer) {
            submitContainer.classList.add('visible');
          }
          e.stopPropagation(); // Prevent the global click handler from immediately closing it
        }
      });

      wrapper.addEventListener('mouseout', function (e) {
        const relatedTarget = e.relatedTarget || e.toElement;
        if (relatedTarget && (this.contains(relatedTarget) || relatedTarget.closest('.quick-add-container'))) {
          return;
        }

        if (quickAddContainer && !isAddingToCart) {
          timeoutId = setTimeout(() => {
            quickAddContainer.classList.remove('open');
            // Only hide fully if no variant is selected
            if (selectedVariantId === null) {
              quickAddContainer.classList.add('hidden');
              // Hide the submit button container if quick add closes and no variant is selected
              if (submitContainer) {
                submitContainer.classList.remove('visible');
              }
            }
          }, 100);
        }
      });

      // Prevent quick add container from closing when hovering over it
      if (quickAddContainer) {
        quickAddContainer.addEventListener('mouseover', function (e) {
          clearTimeout(timeoutId);
          e.stopPropagation();
        });

        quickAddContainer.addEventListener('mouseout', function (e) {
          const relatedTarget = e.relatedTarget || e.toElement;
          if (relatedTarget && this.contains(relatedTarget)) {
            return;
          }

          if (!isAddingToCart) {
            timeoutId = setTimeout(() => {
              this.classList.remove('open');
              if (selectedVariantId === null) {
                this.classList.add('hidden');
                if (submitContainer) {
                  submitContainer.classList.remove('visible');
                }
              }
            }, 100);
          }
        });
      }
    }

    // Handle variant selection
    variantButtons.forEach((button) => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (button.classList.contains('unavailable')) {
          return;
        }

        // Remove selected class from all buttons and add to clicked one
        variantButtons.forEach((btn) => btn.classList.remove('selected'));
        button.classList.add('selected');

        // Get the variant ID from the clicked button
        const variantId = button.dataset.variantId;

        // Update the Add to Cart button with the selected variant ID
        const addToCartButton = wrapper.querySelector('.quick-add-submit-container button');
        if (addToCartButton) {
          addToCartButton.dataset.variantId = variantId;
          addToCartButton.disabled = false;
        }
      });
    });

    const quickAddSubmitContainer = wrapper.querySelector('.quick-add-submit-container');

    const addToCartButton = quickAddSubmitContainer?.querySelector('button');

    if (addToCartButton && window.cartManager) {
      addToCartButton.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const variantId = parseInt(addToCartButton.dataset.variantId);

        if (!variantId || addToCartButton.dataset.clicked === 'true') {
          return;
        }

        isAddingToCart = true; // Set state when starting to add to cart
        addToCartButton.dataset.clicked = 'true';
        addToCartButton.disabled = true; // Disable while adding

        const spinnerContainer = wrapper.querySelector('.spinner-container');
        const spinner = wrapper.querySelector('.loading__spinner');

        try {
          spinnerContainer?.classList.remove('hidden');
          spinner?.classList.remove('hidden');

          const cart = await window.cartManager.fetchCart();
          const existingItem = cart.items.find((item) => item.id === variantId);

          if (existingItem) {
            await window.cartManager.updateCartItem(variantId, existingItem.quantity + 1, addToCartButton, wrapper);
          } else {
            await window.cartManager.addItemToCart(variantId, addToCartButton, wrapper);
          }

          // Reset state after successful add
          variantButtons.forEach((btn) => btn.classList.remove('selected'));
          if (addToCartButton) {
            addToCartButton.disabled = true;
            addToCartButton.dataset.variantId = '';
            delete addToCartButton.dataset.clicked;
          }
        } catch (error) {
          console.error('Error in add to cart:', error);
          window.cartManager.showErrorMessage(error.message || 'Failed to add item to cart');
          if (addToCartButton) {
            addToCartButton.disabled = false;
            delete addToCartButton.dataset.clicked;
          }
          spinnerContainer?.classList.add('hidden');
          spinner?.classList.add('hidden');
        }
      });
    }
  });

  // Add global click handler with improved targeting
  document.addEventListener('click', handleGlobalClick);
};

function handleGlobalClick(e) {
  if (!e.target.closest('.mobile-cart-icon') && !e.target.closest('.quick-add-container')) {
    document.querySelectorAll('.quick-add-container.open').forEach((container) => {
      container.classList.remove('open');
      setTimeout(() => {
        container.classList.add('hidden');
      }, 100);
    });
  }
}

class CartManager {
  constructor() {
    this.routes = window.routes || {};
  }

  async fetchCart() {
    const response = await fetch('/cart.js');
    if (!response.ok) throw new Error('Failed to fetch cart');
    return response.json();
  }

  async updateCartItem(variantId, quantity, button, card) {
    try {
      const response = await fetch('/cart/update.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: variantId,
          quantity: quantity,
        }),
      });

      if (!response.ok) throw new Error('Failed to update item');

      await this.updateCartCount();
      await this.updateCartDrawer();
      button.dataset.clicked = 'false';
      this.hideSpinner(card);

      return response.json();
    } catch (error) {
      console.error('Update Error:', error);
      throw new Error('Failed to update cart item');
    }
  }

  async addItemToCart(variantId, button, card) {
    try {
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quantity: 1,
          id: variantId,
        }),
      });

      if (!response.ok) throw new Error('Failed to add item');

      const quickAddContainer = card.querySelector('.quick-add-container');
      const submitContainer = card.querySelector('.quick-add-submit-container');

      if (quickAddContainer) {
        quickAddContainer.classList.add('open');
        quickAddContainer.classList.remove('hidden');
      }
      if (submitContainer) {
        submitContainer.classList.add('visible');
      }

      await this.updateCartCount();
      button.dataset.clicked = 'false';
      this.hideSpinner(card);

      setTimeout(async () => {
        if (quickAddContainer) {
          quickAddContainer.classList.remove('open');
          quickAddContainer.classList.add('hidden');
        }
        if (submitContainer) {
          submitContainer.classList.remove('visible');
        }
        await this.updateCartDrawer();
      }, 3000);

      return response.json();
    } catch (error) {
      throw new Error('Failed to add item to cart');
    }
  }

  hideSpinner(card) {
    const spinner = card.querySelector('.loading__spinner');
    const spinnerContainer = card.querySelector('.spinner-container');
    const addedToCartMessage = spinnerContainer?.querySelector('.added-to-cart');

    if (spinner) spinner.classList.add('hidden');

    if (addedToCartMessage) {
      addedToCartMessage.classList.remove('hidden');
      setTimeout(() => {
        addedToCartMessage.classList.add('hidden');
        spinnerContainer?.classList.add('hidden');
      }, 2000);
    } else {
      spinnerContainer?.classList.add('hidden');
    }
  }

  async updateCartDrawer() {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const response = await fetch(`${this.routes.cart_url}?section_id=cart-drawer`);
      if (!response.ok) throw new Error('Failed to fetch cart drawer');

      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const cartDrawer = document.getElementById('CartDrawer');
      const drawerInner = cartDrawer?.querySelector('.drawer__inner');
      const newDrawerInner = doc.querySelector('.drawer__inner');

      if (drawerInner && newDrawerInner) {
        // Store the current state of quick add containers
        const openContainers = document.querySelectorAll('.quick-add-container.open');
        const visibleSubmitContainers = document.querySelectorAll('.quick-add-submit-container.visible');

        drawerInner.innerHTML = newDrawerInner.innerHTML;
        document.querySelectorAll('.drawer').forEach((drawer) => {
          drawer.classList.remove('is-empty');
        });

        cartDrawer.classList.remove('is-empty');
        cartDrawer.classList.add('animate', 'active');

        // Restore the state of quick add containers
        openContainers.forEach((container) => {
          container.classList.add('open');
          container.classList.remove('hidden');
        });
        visibleSubmitContainers.forEach((container) => {
          container.classList.add('visible');
        });
      }
    } catch (error) {
      console.error('Error updating cart drawer:', error);
    }
  }

  async updateCartCount() {
    try {
      const cart = await this.fetchCart();
      const itemCount = cart.item_count;

      const cartIconBubble = document.getElementById('cart-icon-bubble');
      let cartCountBubble = cartIconBubble?.querySelector('.cart-count-bubble');

      if (!cartCountBubble) {
        cartCountBubble = document.createElement('div');
        cartCountBubble.className = 'cart-count-bubble';
        cartCountBubble.innerHTML = `
            <span aria-hidden="true">${itemCount}</span>
            <span class="visually-hidden">${itemCount} items</span>
          `;
        cartIconBubble?.appendChild(cartCountBubble);
      } else {
        const ariaHidden = cartCountBubble.querySelector('[aria-hidden="true"]');
        const visuallyHidden = cartCountBubble.querySelector('.visually-hidden');

        if (ariaHidden) ariaHidden.textContent = itemCount;
        if (visuallyHidden) visuallyHidden.textContent = `${itemCount} items`;
      }

      setTimeout(() => {
        const visually = document.querySelector('.cart-count-bubble .visually-hidden');
        visually?.click();
      }, 1000);
    } catch (error) {
      console.error('Error updating cart count:', error);
    }
  }

  showErrorMessage(message) {
    alert(message);
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  setupQuickAdd();
});

// Initialize after load more
document.addEventListener('products:added', () => {
  setupQuickAdd();
});

// Initialize after collection updates
document.addEventListener('collection:updated', () => {
  setupQuickAdd();
});

// Initialize after cart updates
document.addEventListener('cart:add', () => {
  setupQuickAdd();
});

document.addEventListener('cart:update', () => {
  setupQuickAdd();
});

document.addEventListener('cart:refresh', () => {
  setupQuickAdd();
});

// Initialize after section updates
document.addEventListener('shopify:section:load', () => {
  setupQuickAdd();
});

// Create a mutation observer to watch for new products
const quickAddObserver = new MutationObserver((mutations) => {
  let shouldReinitialize = false;

  mutations.forEach((mutation) => {
    if (mutation.addedNodes.length > 0) {
      mutation.addedNodes.forEach((node) => {
        if (
          node.classList &&
          (node.classList.contains('product-card-wrapper') || node.querySelector('.product-card-wrapper'))
        ) {
          shouldReinitialize = true;
        }
      });
    }
  });

  if (shouldReinitialize) {
    setupQuickAdd();
  }
});

// Start observing the product grid
document.addEventListener('DOMContentLoaded', () => {
  const productGrid = document.getElementById('product-grid');
  if (productGrid) {
    quickAddObserver.observe(productGrid, {
      childList: true,
      subtree: true,
    });
  }
});
