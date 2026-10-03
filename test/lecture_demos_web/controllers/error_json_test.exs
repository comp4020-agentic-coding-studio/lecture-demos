defmodule LectureDemosWeb.ErrorJSONTest do
  use LectureDemosWeb.ConnCase, async: true

  test "renders 404" do
    assert LectureDemosWeb.ErrorJSON.render("404.json", %{}) == %{errors: %{detail: "Not Found"}}
  end

  test "renders 500" do
    assert LectureDemosWeb.ErrorJSON.render("500.json", %{}) ==
             %{errors: %{detail: "Internal Server Error"}}
  end
end
