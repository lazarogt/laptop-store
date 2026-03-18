import React from "react";
import { render, screen } from "@testing-library/react";
import App from "@/App";

vi.mock("@/components/ui/toaster", () => ({
  Toaster: () => <div data-testid="mock-toaster" />,
}));

vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/contexts/CartContext", () => ({
  CartProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/contexts/WishlistContext", () => ({
  WishlistProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/pages/HomePage", () => ({ default: () => <div data-testid="home-page">home-page</div> }));
vi.mock("@/pages/ProductPage", () => ({ default: () => <div data-testid="product-page">product-page</div> }));
vi.mock("@/pages/SearchPage", () => ({ default: () => <div data-testid="search-page">search-page</div> }));
vi.mock("@/pages/CartPage", () => ({ default: () => <div data-testid="cart-page">cart-page</div> }));
vi.mock("@/pages/CheckoutPage", () => ({ default: () => <div data-testid="checkout-page">checkout-page</div> }));
vi.mock("@/pages/AuthPage", () => ({ default: () => <div data-testid="auth-page">auth-page</div> }));
vi.mock("@/pages/AdminPage", () => ({ default: () => <div data-testid="admin-page">admin-page</div> }));
vi.mock("@/pages/WishlistPage", () => ({ default: () => <div data-testid="wishlist-page">wishlist-page</div> }));
vi.mock("@/pages/AddProduct", () => ({ default: () => <div data-testid="add-product-page">add-product-page</div> }));
vi.mock("@/pages/MyOrders", () => ({ default: () => <div data-testid="my-orders-page">my-orders-page</div> }));
vi.mock("@/pages/not-found", () => ({ default: () => <div data-testid="not-found-page">not-found-page</div> }));

describe("App smoke", () => {
  it("mounts the root app without rendering heavy page implementations", () => {
    window.history.pushState({}, "", "/");

    const { container } = render(<App />);

    expect(container).toBeTruthy();
    expect(screen.getByTestId("home-page")).toBeInTheDocument();
    expect(screen.getByTestId("mock-toaster")).toBeInTheDocument();
  });
});
