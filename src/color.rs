use std::fmt::Display;

use serde::{Deserialize, Serialize};

// All the colors from the fediverse canvas 2024
#[derive(Clone, Serialize, Deserialize, Default, Copy, Debug)]
#[allow(dead_code)]
pub enum Color {
    #[default]
    White = 0,
    LightGrey,
    MediumGrey,
    DeepGrey,
    DarkGrey,
    Black,
    DarkChocolate,
    Chocolate,
    Brown,
    Peach,
    Beige,
    Pink,
    Magenta,
    Mauve,
    Purple,
    DarkPurple,
    Navy,
    Blue,
    Azure,
    Aqua,
    LightTeal,
    DarkTeal,
    Forest,
    DarkGreen,
    Green,
    Lime,
    PastelYellow,
    Yellow,
    Orange,
    Rust,
    Maroon,
    Rose,
    Red,
    WaterMelon,
}
impl Display for Color {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(match self {
            Color::White => "white",
            Color::LightGrey => "light-grey",
            Color::MediumGrey => "medium-grey",
            Color::DeepGrey => "deep-grey",
            Color::DarkGrey => "dark-grey",
            Color::Black => "black",
            Color::DarkChocolate => "dark-chocolate",
            Color::Chocolate => "chocolate",
            Color::Brown => "brown",
            Color::Peach => "peach",
            Color::Beige => "beige",
            Color::Pink => "pink",
            Color::Magenta => "magenta",
            Color::Mauve => "mauve",
            Color::Purple => "purple",
            Color::DarkPurple => "dark-purple",
            Color::Navy => "navy",
            Color::Blue => "blue",
            Color::Azure => "azure",
            Color::Aqua => "aqua",
            Color::LightTeal => "light-teal",
            Color::DarkTeal => "dark-teal",
            Color::Forest => "forest",
            Color::DarkGreen => "dark-green",
            Color::Green => "green",
            Color::Lime => "lime",
            Color::PastelYellow => "pastel-yellow",
            Color::Yellow => "yellow",
            Color::Orange => "orange",
            Color::Rust => "rust",
            Color::Maroon => "maroon",
            Color::Rose => "rose",
            Color::Red => "red",
            Color::WaterMelon => "watermelon",
        })
    }
}
