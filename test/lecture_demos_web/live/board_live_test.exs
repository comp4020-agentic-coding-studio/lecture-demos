defmodule LectureDemosWeb.BoardLiveTest do
  use LectureDemosWeb.ConnCase

  import Phoenix.LiveViewTest

  test "a message posted in one tab appears in another", %{conn: conn} do
    {:ok, poster, _html} = live(conn, ~p"/")
    {:ok, watcher, _html} = live(build_conn(), ~p"/")

    poster
    |> form("#message-form", message: %{body: "hello from the front row"})
    |> render_submit()

    assert render(watcher) =~ "hello from the front row"
  end

  test "a posted message survives a reload", %{conn: conn} do
    {:ok, view, _html} = live(conn, ~p"/")
    view |> form("#message-form", message: %{body: "still here"}) |> render_submit()

    {:ok, _view, html} = live(build_conn(), ~p"/")
    assert html =~ "still here"
  end

  test "a blank message is refused", %{conn: conn} do
    {:ok, view, _html} = live(conn, ~p"/")

    assert view |> form("#message-form", message: %{body: "   "}) |> render_submit() =~
             "can&#39;t be blank"
  end
end
