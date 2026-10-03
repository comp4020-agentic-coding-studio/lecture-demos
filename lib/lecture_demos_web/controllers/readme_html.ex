defmodule LectureDemosWeb.ReadmeHTML do
  use LectureDemosWeb, :html

  def show(assigns) do
    ~H"""
    <Layouts.app flash={@flash}>
      <article class="prose">{@readme_html}</article>
    </Layouts.app>
    """
  end
end
