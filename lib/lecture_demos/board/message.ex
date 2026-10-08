defmodule LectureDemos.Board.Message do
  use Ecto.Schema
  import Ecto.Changeset

  # GIF links are only accepted from these hosts (media1.giphy.com, etc.)
  @gif_hosts ~r/\A(media\d*\.giphy\.com|media\d*\.tenor\.com|i\.imgur\.com)\z/

  schema "board_messages" do
    field :body, :string
    field :gif_url, :string

    belongs_to :parent, __MODULE__
    has_many :replies, __MODULE__, foreign_key: :parent_id

    timestamps(type: :utc_datetime)
  end

  def changeset(message, attrs) do
    message
    |> cast(attrs, [:body])
    |> update_change(:body, &String.trim/1)
    |> validate_required([:body])
    |> validate_length(:body, max: 500)
  end

  @doc """
  A reply needs text, a GIF, or both. The parent is set by the caller, never
  cast from user input, so replies stay one level deep.
  """
  def reply_changeset(message, attrs) do
    message
    |> cast(attrs, [:body, :gif_url])
    |> update_change(:body, &String.trim/1)
    |> update_change(:gif_url, &String.trim/1)
    |> validate_length(:body, max: 500)
    |> validate_gif_url()
    |> validate_text_or_gif()
  end

  defp validate_gif_url(changeset) do
    validate_change(changeset, :gif_url, fn :gif_url, url ->
      case URI.parse(url) do
        %URI{scheme: "https", host: host} when is_binary(host) ->
          if Regex.match?(@gif_hosts, host),
            do: [],
            else: [gif_url: "must be a giphy, tenor or imgur link"]

        _ ->
          [gif_url: "must be an https link"]
      end
    end)
  end

  defp validate_text_or_gif(changeset) do
    if blank?(get_field(changeset, :body)) and blank?(get_field(changeset, :gif_url)) do
      add_error(changeset, :body, "add some text, an emoji or a GIF")
    else
      changeset
    end
  end

  defp blank?(value), do: value in [nil, ""]
end
